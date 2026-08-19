"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartTooltip,
  ChartTooltipContent,
  DashboardChartContainer,
  type ChartConfig,
} from "@/components/charts/chart-container"
import { formatPercent } from "@/lib/format/round"
import type { StockHoldingSnapshot } from "@/lib/types/stock-holding"

const CHART_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

interface StockHoldingStackedBarChartProps {
  snapshots: StockHoldingSnapshot[]
}

interface MonthlyChartPoint {
  monthLabel: string
  [stockName: string]: string | number
}

interface LegendItem {
  stockName: string
  color: string
  weightRate: number
}

function toMonthLabel(snapshotDate: string): string {
  return snapshotDate.slice(0, 7)
}

function buildChartData(snapshots: StockHoldingSnapshot[]): {
  data: MonthlyChartPoint[]
  stockNames: string[]
  weightRateByStock: Map<string, number>
} {
  const stockNames = [...new Set(snapshots.map((s) => s.stockName))]
  const monthLabels = [
    ...new Set(snapshots.map((s) => toMonthLabel(s.snapshotDate))),
  ].sort()

  // 한 달에 스냅샷이 여러 날 있으면(향후 매일 수집 누적 시) 그 달의 마지막 날짜를 대표값으로 사용한다.
  const latestByMonthStock = new Map<string, StockHoldingSnapshot>()
  for (const snapshot of snapshots) {
    const key = `${toMonthLabel(snapshot.snapshotDate)}__${snapshot.stockName}`
    const existing = latestByMonthStock.get(key)
    if (!existing || snapshot.snapshotDate > existing.snapshotDate) {
      latestByMonthStock.set(key, snapshot)
    }
  }

  const data = monthLabels.map((monthLabel) => {
    const point: MonthlyChartPoint = { monthLabel }
    for (const stockName of stockNames) {
      const snapshot = latestByMonthStock.get(`${monthLabel}__${stockName}`)
      point[stockName] = snapshot?.valuationAmount ?? 0
    }
    return point
  })

  // 범례에 표시할 비중은 조회 기간 중 가장 최근(마지막 달) 스냅샷 기준으로 계산한다.
  const latestMonth = monthLabels[monthLabels.length - 1]
  const weightRateByStock = new Map<string, number>()
  for (const stockName of stockNames) {
    const snapshot = latestByMonthStock.get(`${latestMonth}__${stockName}`)
    weightRateByStock.set(stockName, snapshot?.weightRate ?? 0)
  }

  return { data, stockNames, weightRateByStock }
}

export function StockHoldingStackedBarChart({
  snapshots,
}: StockHoldingStackedBarChartProps) {
  const { data, stockNames, weightRateByStock } = buildChartData(snapshots)

  const config: ChartConfig = stockNames.reduce((acc, stockName, index) => {
    acc[stockName] = {
      label: stockName,
      color: CHART_COLOR_VARS[index % CHART_COLOR_VARS.length],
    }
    return acc
  }, {} as ChartConfig)

  const legendItems: LegendItem[] = stockNames.map((stockName, index) => ({
    stockName,
    color: CHART_COLOR_VARS[index % CHART_COLOR_VARS.length],
    weightRate: weightRateByStock.get(stockName) ?? 0,
  }))

  // 월이 많아질수록 가로 스크롤이 필요하므로 데이터 개수에 비례한 최소 너비를 준다.
  const minWidth = Math.max(data.length * 80, 480)

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        조회된 데이터가 없습니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {legendItems.map((item) => (
          <div key={item.stockName} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            <span>
              {item.stockName}{" "}
              <span className="text-muted-foreground">
                {formatPercent(item.weightRate * 100, 1)}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <DashboardChartContainer
          config={config}
          className="h-72"
          style={{ width: minWidth, minWidth: "100%" }}
        >
          <BarChart data={data} margin={{ left: 12, right: 12, top: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={80}
              tickFormatter={(value: number) => value.toLocaleString()}
            />
            <ChartTooltip
              shared={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const weightRate = weightRateByStock.get(String(name)) ?? 0
                    return (
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {Number(value).toLocaleString()} (
                          {formatPercent(weightRate * 100, 1)})
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            {stockNames.map((stockName, index) => (
              <Bar
                key={stockName}
                dataKey={stockName}
                stackId="stock-holding"
                fill={CHART_COLOR_VARS[index % CHART_COLOR_VARS.length]}
              />
            ))}
          </BarChart>
        </DashboardChartContainer>
      </div>
    </div>
  )
}
