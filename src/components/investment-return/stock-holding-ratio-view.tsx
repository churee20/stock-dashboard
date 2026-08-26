"use client"

import { useMemo, useState } from "react"
import dayjs from "dayjs"

import {
  YearMonthRangeSelect,
  type YearMonthRangeValue,
} from "@/components/forms/year-month-range-select"
import { StockHoldingStackedBarChart } from "@/components/investment-return/stock-holding-stacked-bar-chart"
import type { StockHoldingSnapshot } from "@/lib/types/stock-holding"

interface StockHoldingRatioViewProps {
  snapshots: StockHoldingSnapshot[]
}

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

// 스냅샷 전체 기간을 기본 조회 범위로 사용한다("연도 default는 전체 연도가 조회되도록").
function defaultYearMonthRange(
  snapshots: StockHoldingSnapshot[]
): YearMonthRangeValue {
  if (snapshots.length === 0) {
    const today = dayjs()
    return {
      fromYear: today.year(),
      fromMonth: 1,
      toYear: today.year(),
      toMonth: today.month() + 1,
    }
  }

  const dates = snapshots.map((s) => dayjs(s.snapshotDate)).sort((a, b) =>
    a.valueOf() - b.valueOf()
  )
  const first = dates[0]
  const last = dates[dates.length - 1]

  return {
    fromYear: first.year(),
    fromMonth: first.month() + 1,
    toYear: last.year(),
    toMonth: last.month() + 1,
  }
}

export function StockHoldingRatioView({
  snapshots,
}: StockHoldingRatioViewProps) {
  const [yearMonthRange, setYearMonthRange] = useState<YearMonthRangeValue>(
    () => defaultYearMonthRange(snapshots)
  )

  const filteredSnapshots = useMemo(() => {
    const from = dayjs(
      `${yearMonthRange.fromYear}-${String(yearMonthRange.fromMonth).padStart(2, "0")}-01`
    ).format("YYYY-MM-DD")
    const to = dayjs(
      `${yearMonthRange.toYear}-${String(yearMonthRange.toMonth).padStart(2, "0")}-01`
    )
      .endOf("month")
      .format("YYYY-MM-DD")

    return snapshots.filter(
      (s) => s.snapshotDate >= from && s.snapshotDate <= to
    )
  }, [snapshots, yearMonthRange])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <YearMonthRangeSelect
          value={yearMonthRange}
          onChange={setYearMonthRange}
          yearOptions={YEAR_OPTIONS}
        />
      </div>
      <StockHoldingStackedBarChart snapshots={filteredSnapshots} />
    </div>
  )
}
