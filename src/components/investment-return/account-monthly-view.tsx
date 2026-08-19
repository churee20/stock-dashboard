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
import { AccountMonthlyTable } from "@/components/investment-return/account-monthly-table"
import type { Account, AccountSnapshot } from "@/lib/types/account"
import type { AccountMonthlyRow } from "@/lib/types/investment-return"

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
      return {
        monthLabel,
        accountId: snapshot.accountId,
        accountName: accountNameById.get(snapshot.accountId) ?? "-",
        principalAmount: snapshot.principalAmount,
        currentAmount: snapshot.currentAmount,
        profitAmount: snapshot.profitAmount,
        // DB의 profit_rate는 소수(예: 1.667901)로 저장되어 있다.
        // 기존 PeriodTableRow 관례(원금 대비 재계산 후 *100)와 통일해 %단위 값으로 변환한다.
        profitRate: snapshot.profitRate * 100,
      }
    })
    .sort((a, b) =>
      a.monthLabel === b.monthLabel
        ? a.accountName.localeCompare(b.accountName)
        : a.monthLabel.localeCompare(b.monthLabel)
    )
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
          <AccountMonthlyTable rows={rows} />
        </>
      )}
    </div>
  )
}
