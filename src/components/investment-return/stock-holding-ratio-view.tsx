"use client"

import { useMemo, useState } from "react"
import dayjs from "dayjs"
import type { DateRange } from "react-day-picker"

import { DateRangePicker } from "@/components/forms/date-range-picker"
import { StockHoldingStackedBarChart } from "@/components/investment-return/stock-holding-stacked-bar-chart"
import type { StockHoldingSnapshot } from "@/lib/types/stock-holding"

interface StockHoldingRatioViewProps {
  snapshots: StockHoldingSnapshot[]
}

// 스냅샷 전체 기간을 기본 조회 범위로 사용한다.
function defaultDateRange(snapshots: StockHoldingSnapshot[]): DateRange {
  if (snapshots.length === 0) {
    const today = dayjs()
    return { from: today.toDate(), to: today.toDate() }
  }

  const dates = snapshots.map((s) => s.snapshotDate).sort()
  return {
    from: dayjs(dates[0]).toDate(),
    to: dayjs(dates[dates.length - 1]).toDate(),
  }
}

export function StockHoldingRatioView({
  snapshots,
}: StockHoldingRatioViewProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    defaultDateRange(snapshots)
  )

  const filteredSnapshots = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return snapshots
    const from = dayjs(dateRange.from).format("YYYY-MM-DD")
    const to = dayjs(dateRange.to).format("YYYY-MM-DD")
    return snapshots.filter(
      (s) => s.snapshotDate >= from && s.snapshotDate <= to
    )
  }, [snapshots, dateRange])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>
      <StockHoldingStackedBarChart snapshots={filteredSnapshots} />
    </div>
  )
}
