"use client"

import { useState } from "react"

import {
  TrendLineChart,
  type TrendLineDataPoint,
  type TrendLineSeriesConfig,
} from "@/components/charts/trend-line-chart"
import { Button } from "@/components/ui/button"
import type { PeriodTableRow } from "@/lib/types/period-view"
import { cn } from "@/lib/utils"

interface PeriodTrendChartProps {
  rows: PeriodTableRow[]
}

const SERIES: TrendLineSeriesConfig[] = [
  { key: "전체합계", label: "전체", colorVar: "var(--chart-1)" },
  { key: "연금", label: "연금", colorVar: "var(--chart-2)" },
  { key: "개인투자", label: "개인투자", colorVar: "var(--chart-3)" },
]

function buildChartData(
  rows: PeriodTableRow[],
  yAxisMode: "amount" | "profitRate"
): TrendLineDataPoint[] {
  const periodLabels = Array.from(new Set(rows.map((row) => row.periodLabel)))

  return periodLabels.map((periodLabel) => {
    const point: TrendLineDataPoint = { periodLabel }

    for (const series of SERIES) {
      const row = rows.find(
        (r) => r.periodLabel === periodLabel && r.group === series.key
      )
      point[series.key] =
        row === undefined
          ? 0
          : yAxisMode === "profitRate"
            ? row.profitRate
            : row.currentAmount
    }

    return point
  })
}

export function PeriodTrendChart({ rows }: PeriodTrendChartProps) {
  const [yAxisMode, setYAxisMode] = useState<"amount" | "profitRate">(
    "amount"
  )

  const data = buildChartData(rows, yAxisMode)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(yAxisMode === "amount" && "bg-accent")}
          onClick={() => setYAxisMode("amount")}
        >
          금액
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(yAxisMode === "profitRate" && "bg-accent")}
          onClick={() => setYAxisMode("profitRate")}
        >
          수익률
        </Button>
      </div>
      <TrendLineChart data={data} series={SERIES} yAxisMode={yAxisMode} />
    </div>
  )
}
