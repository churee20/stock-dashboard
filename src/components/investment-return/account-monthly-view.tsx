"use client"

import { useMemo, useState } from "react"
import dayjs from "dayjs"

import { AccountMultiSelectWithToggle } from "@/components/investment-return/account-multi-select-with-toggle"
import {
  YearRangeSelect,
  type YearRangeValue,
} from "@/components/forms/year-range-select"
import {
  AmountRateComboChart,
  type AmountRateComboPoint,
} from "@/components/charts/amount-rate-combo-chart"
import { AccountSummaryTable } from "@/components/investment-return/account-summary-table"
import type { Account, AccountSnapshot } from "@/lib/types/account"
import type {
  AccountMonthlyRow,
  AccountSummaryGroup,
  AccountSummaryGroupRow,
  AccountSummaryRow,
} from "@/lib/types/investment-return"

interface AccountMonthlyViewProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

// 계좌별로 각 월의 마지막 스냅샷(월말 대표값)만 골라 AccountMonthlyRow로 변환한다.
// account_snapshots는 월별 백필분은 월말일 1건, 일별 실 데이터는 여러 건이 섞여 있으므로
// 월 단위로 그룹핑 후 snapshotDate가 가장 늦은 것을 대표값으로 사용한다.
function buildMonthlyRows(
  accounts: Account[],
  snapshots: AccountSnapshot[],
  yearRange: YearRangeValue,
  selectedAccountIds: string[]
): AccountMonthlyRow[] {
  const accountNameById = new Map(accounts.map((a) => [a.id, a.accountName]))
  const accountIdSet = new Set(selectedAccountIds)

  const latestByKey = new Map<string, AccountSnapshot>()
  for (const snapshot of snapshots) {
    if (!accountIdSet.has(snapshot.accountId)) continue
    const d = dayjs(snapshot.snapshotDate)
    const year = d.year()
    if (year < yearRange.fromYear || year > yearRange.toYear) continue

    const monthLabel = d.format("YYYY-MM")
    const key = `${snapshot.accountId}__${monthLabel}`
    const existing = latestByKey.get(key)
    if (!existing || snapshot.snapshotDate > existing.snapshotDate) {
      latestByKey.set(key, snapshot)
    }
  }

  return Array.from(latestByKey.entries())
    .map(([key, snapshot]) => {
      const monthLabel = key.split("__")[1]
      const profitAmount = snapshot.currentAmount - snapshot.principalAmount
      // DB의 profit_rate는 소스에 따라 저장 단위가 다르다(엑셀 백필분은 소수, Google Sheets
      // 실 수집분은 이미 %단위 숫자). 이 컬럼을 신뢰하지 않고 기존 PeriodTableRow 관례와 동일하게
      // 원금/현재금액으로 항상 직접 재계산해 단위 불일치를 원천 차단한다.
      const profitRate =
        snapshot.principalAmount === 0
          ? 0
          : (profitAmount / snapshot.principalAmount) * 100

      return {
        monthLabel,
        accountId: snapshot.accountId,
        accountName: accountNameById.get(snapshot.accountId) ?? "-",
        principalAmount: snapshot.principalAmount,
        currentAmount: snapshot.currentAmount,
        profitAmount,
        profitRate,
      }
    })
    .sort((a, b) =>
      a.monthLabel === b.monthLabel
        ? a.accountName.localeCompare(b.accountName)
        : a.monthLabel.localeCompare(b.monthLabel)
    )
}

// 계좌 단위 요약 리스트를 만든다.
// - 원금/평가액 MIN·MAX/조회 수익(율): 조회 조건(연도 범위·선택 계좌)에 해당하는 monthlyRows 기준
// - 비중: 조회 조건 내 계좌들의 평가액(MAX) 합계 대비 비율
// - 누적 수익/총수익율(현재): 조회 조건과 무관하게 계좌 전체 스냅샷 이력(최초 원금~최신 현재금액) 기준
function buildSummaryRows(
  accounts: Account[],
  snapshots: AccountSnapshot[],
  monthlyRows: AccountMonthlyRow[]
): AccountSummaryRow[] {
  const accountNameById = new Map(accounts.map((a) => [a.id, a.accountName]))
  const accountBrokerById = new Map(
    accounts.map((a) => [a.id, a.accountNoMasked])
  )

  const rowsByAccount = new Map<string, AccountMonthlyRow[]>()
  for (const row of monthlyRows) {
    const list = rowsByAccount.get(row.accountId)
    if (list) {
      list.push(row)
    } else {
      rowsByAccount.set(row.accountId, [row])
    }
  }

  const summaries = Array.from(rowsByAccount.entries()).map(
    ([accountId, accountRows]) => {
      const sortedByMonth = [...accountRows].sort((a, b) =>
        a.monthLabel.localeCompare(b.monthLabel)
      )
      const principalAmount = sortedByMonth[0].principalAmount
      const valuationMin = Math.min(...accountRows.map((r) => r.currentAmount))
      const valuationMax = Math.max(...accountRows.map((r) => r.currentAmount))
      const periodProfitAmount = valuationMax - valuationMin
      const periodProfitRate =
        valuationMin === 0 ? 0 : (periodProfitAmount / valuationMin) * 100

      const accountSnapshots = snapshots
        .filter((s) => s.accountId === accountId)
        .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
      const firstSnapshot = accountSnapshots[0]
      const lastSnapshot = accountSnapshots[accountSnapshots.length - 1]
      const initialPrincipal = firstSnapshot?.principalAmount ?? principalAmount
      const latestAmount = lastSnapshot?.currentAmount ?? valuationMax
      const cumulativeProfitAmount = latestAmount - initialPrincipal
      const totalReturnRate =
        initialPrincipal === 0
          ? 0
          : (cumulativeProfitAmount / initialPrincipal) * 100

      return {
        accountId,
        accountName: accountNameById.get(accountId) ?? "-",
        broker: accountBrokerById.get(accountId) ?? "-",
        principalAmount,
        valuationMin,
        valuationMax,
        weightRate: 0,
        periodProfitAmount,
        periodProfitRate,
        currentValuation: latestAmount,
        cumulativeProfitAmount,
        totalReturnRate,
      }
    }
  )

  const totalValuationMax = summaries.reduce(
    (sum, s) => sum + s.valuationMax,
    0
  )

  return summaries
    .map((s) => ({
      ...s,
      weightRate:
        totalValuationMax === 0 ? 0 : (s.valuationMax / totalValuationMax) * 100,
    }))
    .sort((a, b) => b.valuationMax - a.valuationMax)
}

// summaryRows 목록을 합산해 소계/전체 합계 1건을 만든다.
// 금액 컬럼은 단순 합산, 비율 컬럼(조회 수익율/총수익율)은 합산된 금액으로 재계산한다.
// weightRate는 totalValuationMax(전체 합계의 평가액 MAX) 대비 이 그룹의 비중이다.
function summarizeRows(
  label: string,
  rows: AccountSummaryRow[],
  totalValuationMax: number
): AccountSummaryGroupRow {
  const principalAmount = rows.reduce((sum, r) => sum + r.principalAmount, 0)
  const valuationMin = rows.reduce((sum, r) => sum + r.valuationMin, 0)
  const valuationMax = rows.reduce((sum, r) => sum + r.valuationMax, 0)
  const weightRate =
    totalValuationMax === 0 ? 0 : (valuationMax / totalValuationMax) * 100
  const periodProfitAmount = valuationMax - valuationMin
  const periodProfitRate =
    valuationMin === 0 ? 0 : (periodProfitAmount / valuationMin) * 100
  const currentValuation = rows.reduce((sum, r) => sum + r.currentValuation, 0)
  const cumulativeProfitAmount = rows.reduce(
    (sum, r) => sum + r.cumulativeProfitAmount,
    0
  )
  const initialPrincipal = currentValuation - cumulativeProfitAmount
  const totalReturnRate =
    initialPrincipal === 0
      ? 0
      : (cumulativeProfitAmount / initialPrincipal) * 100

  return {
    label,
    principalAmount,
    valuationMin,
    valuationMax,
    weightRate,
    periodProfitAmount,
    periodProfitRate,
    currentValuation,
    cumulativeProfitAmount,
    totalReturnRate,
  }
}

// summaryRows를 accountType(연금/개인투자) 기준으로 묶어 "현재 실적" 화면과 동일한
// 접기/펼치기 그룹 구조(소계 + 소속 계좌 목록)를 만든다.
function buildSummaryGroups(
  accounts: Account[],
  summaryRows: AccountSummaryRow[],
  totalValuationMax: number
): AccountSummaryGroup[] {
  const accountTypeById = new Map(accounts.map((a) => [a.id, a.accountType]))
  const groupTypes: Account["accountType"][] = ["연금", "개인투자"]

  return groupTypes
    .map((groupType) => {
      const rows = summaryRows.filter(
        (row) => accountTypeById.get(row.accountId) === groupType
      )
      if (rows.length === 0) return null

      return {
        groupType,
        summary: summarizeRows(`${groupType} 소계`, rows, totalValuationMax),
        rows,
      }
    })
    .filter((group): group is AccountSummaryGroup => group !== null)
}

function buildChartData(rows: AccountMonthlyRow[]): AmountRateComboPoint[] {
  const monthLabels = Array.from(new Set(rows.map((r) => r.monthLabel))).sort()

  return monthLabels.map((monthLabel) => {
    const monthRows = rows.filter((r) => r.monthLabel === monthLabel)
    const amount = monthRows.reduce((sum, r) => sum + r.currentAmount, 0)
    const principal = monthRows.reduce((sum, r) => sum + r.principalAmount, 0)
    const profitRate =
      principal === 0
        ? 0
        : ((amount - principal) / principal) * 100

    return { periodLabel: monthLabel, amount, profitRate }
  })
}

// 스냅샷 전체 기간을 기본 조회 범위로 사용한다("연도 default는 전체 연도가 조회되도록").
// 스냅샷이 없으면 YEAR_OPTIONS 전체 범위로 폴백한다.
function defaultYearRange(snapshots: AccountSnapshot[]): YearRangeValue {
  if (snapshots.length === 0) {
    return {
      fromYear: YEAR_OPTIONS[0],
      toYear: YEAR_OPTIONS[YEAR_OPTIONS.length - 1],
    }
  }

  const years = snapshots.map((s) => dayjs(s.snapshotDate).year())
  return { fromYear: Math.min(...years), toYear: Math.max(...years) }
}

export function AccountMonthlyView({
  accounts,
  snapshots,
}: AccountMonthlyViewProps) {
  const [yearRange, setYearRange] = useState<YearRangeValue>(() =>
    defaultYearRange(snapshots)
  )
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.map((a) => a.id)
  )

  const rows = useMemo(
    () => buildMonthlyRows(accounts, snapshots, yearRange, selectedAccountIds),
    [accounts, snapshots, yearRange, selectedAccountIds]
  )

  const chartData = useMemo(() => buildChartData(rows), [rows])

  const summaryRows = useMemo(
    () => buildSummaryRows(accounts, snapshots, rows),
    [accounts, snapshots, rows]
  )

  const totalValuationMax = useMemo(
    () => summaryRows.reduce((sum, r) => sum + r.valuationMax, 0),
    [summaryRows]
  )

  const groups = useMemo(
    () => buildSummaryGroups(accounts, summaryRows, totalValuationMax),
    [accounts, summaryRows, totalValuationMax]
  )

  const totalSummary = useMemo(
    () => summarizeRows("전체 합계", summaryRows, totalValuationMax),
    [summaryRows, totalValuationMax]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AccountMultiSelectWithToggle
          accounts={accounts}
          selectedAccountIds={selectedAccountIds}
          onChange={setSelectedAccountIds}
        />
        <YearRangeSelect
          value={yearRange}
          onChange={setYearRange}
          yearOptions={YEAR_OPTIONS}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          조회된 데이터가 없습니다.
        </p>
      ) : (
        <>
          <AmountRateComboChart data={chartData} />
          <AccountSummaryTable groups={groups} totalSummary={totalSummary} />
        </>
      )}
    </div>
  )
}
