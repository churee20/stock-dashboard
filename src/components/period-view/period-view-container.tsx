"use client"

import { useMemo, useState } from "react"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"
import type { DateRange } from "react-day-picker"

import { PeriodDetailTable } from "@/components/period-view/period-detail-table"
import { PeriodFilterForm } from "@/components/period-view/period-filter-form"
import { PeriodTrendChart } from "@/components/period-view/period-trend-chart"
import {
  MonthRangeSelect,
  type MonthRangeValue,
} from "@/components/forms/month-range-select"
import { AccountMultiSelect } from "@/components/forms/account-multi-select"
import { aggregateToMonthly, aggregateToWeekly } from "@/lib/dummy-data/aggregate"
import { filterSnapshotsByDateRange } from "@/lib/dummy-data/select-latest"
import type { Account, AccountSnapshot } from "@/lib/types/account"
import type {
  PeriodGranularity,
  PeriodTableRow,
} from "@/lib/types/period-view"

dayjs.extend(isoWeek)

interface PeriodViewContainerProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
  granularity: PeriodGranularity
}

const HEADER_LABEL_BY_GRANULARITY: Record<PeriodGranularity, string> = {
  daily: "날짜",
  weekly: "주차",
  monthly: "년월",
}

function weekPeriodLabel(date: string): string {
  const d = dayjs(date)
  const start = d.startOf("isoWeek").format("YYYY-MM-DD")
  const end = d.endOf("isoWeek").format("YYYY-MM-DD")
  return `${start}~${end}`
}

function buildPeriodTableRows(
  accounts: Account[],
  snapshots: AccountSnapshot[],
  granularity: PeriodGranularity
): PeriodTableRow[] {
  const accountTypeById = new Map(accounts.map((a) => [a.id, a.accountType]))

  const periodLabelOf = (date: string): string => {
    if (granularity === "weekly") return weekPeriodLabel(date)
    if (granularity === "monthly") return dayjs(date).format("YYYY-MM")
    return date
  }

  const rowsByKey = new Map<
    string,
    { periodLabel: string; group: string; principalAmount: number; currentAmount: number }
  >()

  for (const snapshot of snapshots) {
    const accountType = accountTypeById.get(snapshot.accountId)
    if (!accountType) continue

    const periodLabel = periodLabelOf(snapshot.snapshotDate)

    for (const group of [accountType, "전체합계"]) {
      const key = `${periodLabel}__${group}`
      const existing = rowsByKey.get(key) ?? {
        periodLabel,
        group,
        principalAmount: 0,
        currentAmount: 0,
      }

      rowsByKey.set(key, {
        periodLabel,
        group,
        principalAmount: existing.principalAmount + snapshot.principalAmount,
        currentAmount: existing.currentAmount + snapshot.currentAmount,
      })
    }
  }

  return Array.from(rowsByKey.values()).map((row) => {
    const profitAmount = row.currentAmount - row.principalAmount
    const profitRate =
      row.principalAmount === 0 ? 0 : (profitAmount / row.principalAmount) * 100

    return {
      periodLabel: row.periodLabel,
      group: row.group,
      principalAmount: row.principalAmount,
      currentAmount: row.currentAmount,
      profitAmount,
      profitRate,
      isTotalRow: row.group === "전체합계",
    }
  })
}

function defaultDateRange(): DateRange {
  const to = dayjs("2026-07-16")
  const from = to.subtract(29, "day")
  return { from: from.toDate(), to: to.toDate() }
}

function toDateString(date: Date | undefined): string {
  return date ? dayjs(date).format("YYYY-MM-DD") : ""
}

export function PeriodViewContainer({
  accounts,
  snapshots,
  granularity,
}: PeriodViewContainerProps) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.map((a) => a.id)
  )
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    defaultDateRange()
  )
  const [monthRange, setMonthRange] = useState<MonthRangeValue>({
    year: 2026,
    startMonth: 1,
    endMonth: 7,
  })

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => selectedAccountIds.includes(a.id)),
    [accounts, selectedAccountIds]
  )

  const rows = useMemo(() => {
    const accountIdSet = new Set(selectedAccountIds)
    const snapshotsByAccount = snapshots.filter((s) =>
      accountIdSet.has(s.accountId)
    )

    if (granularity === "monthly") {
      const startDate = `${monthRange.year}-${String(monthRange.startMonth).padStart(2, "0")}-01`
      const endDate = dayjs(
        `${monthRange.year}-${String(monthRange.endMonth).padStart(2, "0")}-01`
      )
        .endOf("month")
        .format("YYYY-MM-DD")

      const monthlySnapshots = aggregateToMonthly(snapshotsByAccount)
      const filtered = filterSnapshotsByDateRange(
        monthlySnapshots,
        startDate,
        endDate
      )
      return buildPeriodTableRows(filteredAccounts, filtered, granularity)
    }

    const startDate = toDateString(dateRange?.from)
    const endDate = toDateString(dateRange?.to)

    const baseSnapshots =
      granularity === "weekly"
        ? aggregateToWeekly(snapshotsByAccount)
        : snapshotsByAccount

    const filtered =
      startDate && endDate
        ? filterSnapshotsByDateRange(baseSnapshots, startDate, endDate)
        : baseSnapshots

    return buildPeriodTableRows(filteredAccounts, filtered, granularity)
  }, [
    snapshots,
    selectedAccountIds,
    filteredAccounts,
    granularity,
    dateRange,
    monthRange,
  ])

  return (
    <div className="flex flex-col gap-4">
      {granularity === "monthly" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AccountMultiSelect
            accounts={accounts}
            selectedAccountIds={selectedAccountIds}
            onChange={setSelectedAccountIds}
          />
          <MonthRangeSelect
            value={monthRange}
            onChange={setMonthRange}
            yearOptions={[2024, 2025, 2026]}
          />
        </div>
      ) : (
        <PeriodFilterForm
          accounts={accounts}
          selectedAccountIds={selectedAccountIds}
          onAccountsChange={setSelectedAccountIds}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      )}

      <PeriodTrendChart rows={rows} />

      <PeriodDetailTable
        rows={rows}
        headerLabel={HEADER_LABEL_BY_GRANULARITY[granularity]}
      />
    </div>
  )
}
