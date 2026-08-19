"use client"

import { useMemo, useState } from "react"
import dayjs from "dayjs"
import type { DateRange } from "react-day-picker"

import { DateRangePicker } from "@/components/forms/date-range-picker"
import { StockHoldingTrendLineChart } from "@/components/investment-return/stock-holding-trend-line-chart"
import { StockHoldingCompareTable } from "@/components/investment-return/stock-holding-compare-table"
import type {
  StockHoldingCompareRow,
  StockHoldingSnapshot,
} from "@/lib/types/stock-holding"

interface StockHoldingListViewProps {
  snapshots: StockHoldingSnapshot[]
}

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

function filterByRange(
  snapshots: StockHoldingSnapshot[],
  dateRange: DateRange | undefined
): StockHoldingSnapshot[] {
  if (!dateRange?.from || !dateRange?.to) return snapshots
  const from = dayjs(dateRange.from).format("YYYY-MM-DD")
  const to = dayjs(dateRange.to).format("YYYY-MM-DD")
  return snapshots.filter((s) => s.snapshotDate >= from && s.snapshotDate <= to)
}

// 선택 기간 내에서 종목별 첫(from)/마지막(to) 시점 스냅샷을 찾아 비교 행을 만든다.
// 누적배당금/누적수익/총수익률은 조회조건과 무관하게 항상 전체 스냅샷 중 최신값을 사용한다.
function buildCompareRows(
  allSnapshots: StockHoldingSnapshot[],
  inRangeSnapshots: StockHoldingSnapshot[]
): StockHoldingCompareRow[] {
  const stockCodes = [...new Set(inRangeSnapshots.map((s) => s.stockCode))]

  const latestOverallByStock = new Map<string, StockHoldingSnapshot>()
  for (const snapshot of allSnapshots) {
    const existing = latestOverallByStock.get(snapshot.stockCode)
    if (!existing || snapshot.snapshotDate > existing.snapshotDate) {
      latestOverallByStock.set(snapshot.stockCode, snapshot)
    }
  }

  return stockCodes
    .map((stockCode) => {
      const stockSnapshots = inRangeSnapshots
        .filter((s) => s.stockCode === stockCode)
        .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))

      const fromSnapshot = stockSnapshots[0]
      const toSnapshot = stockSnapshots[stockSnapshots.length - 1]
      const latest = latestOverallByStock.get(stockCode)
      if (!fromSnapshot || !toSnapshot || !latest) return null

      const periodProfitAmount =
        toSnapshot.valuationAmount - fromSnapshot.valuationAmount
      const periodProfitRate =
        fromSnapshot.valuationAmount === 0
          ? 0
          : periodProfitAmount / fromSnapshot.valuationAmount

      return {
        stockCode,
        stockName: toSnapshot.stockName,
        country: toSnapshot.country,
        valuationFrom: fromSnapshot.valuationAmount,
        valuationTo: toSnapshot.valuationAmount,
        weightFrom: fromSnapshot.weightRate,
        weightTo: toSnapshot.weightRate,
        periodProfitAmount,
        periodProfitRate,
        cumulativeDividend: latest.cumulativeDividend,
        cumulativeProfit: latest.cumulativeProfit,
        totalReturnRate: latest.totalReturnRate,
      }
    })
    .filter((row): row is StockHoldingCompareRow => row !== null)
}

export function StockHoldingListView({
  snapshots,
}: StockHoldingListViewProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    defaultDateRange(snapshots)
  )

  const inRangeSnapshots = useMemo(
    () => filterByRange(snapshots, dateRange),
    [snapshots, dateRange]
  )

  const compareRows = useMemo(
    () => buildCompareRows(snapshots, inRangeSnapshots),
    [snapshots, inRangeSnapshots]
  )

  const fromLabel = dateRange?.from ? dayjs(dateRange.from).format("YYYY-MM-DD") : "from"
  const toLabel = dateRange?.to ? dayjs(dateRange.to).format("YYYY-MM-DD") : "to"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>
      <StockHoldingTrendLineChart snapshots={inRangeSnapshots} />
      <StockHoldingCompareTable
        rows={compareRows}
        fromLabel={fromLabel}
        toLabel={toLabel}
      />
    </div>
  )
}
