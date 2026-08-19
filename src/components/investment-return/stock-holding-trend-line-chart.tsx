"use client"

import { useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartTooltip,
  ChartTooltipContent,
  DashboardChartContainer,
  type ChartConfig,
} from "@/components/charts/chart-container"
import type { StockHoldingSnapshot } from "@/lib/types/stock-holding"

const CHART_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

interface StockHoldingTrendLineChartProps {
  snapshots: StockHoldingSnapshot[]
}

interface TrendPoint {
  snapshotDate: string
  [stockName: string]: string | number
}

function buildChartData(snapshots: StockHoldingSnapshot[]): {
  data: TrendPoint[]
  stockNames: string[]
} {
  const stockNames = [...new Set(snapshots.map((s) => s.stockName))]
  const dates = [...new Set(snapshots.map((s) => s.snapshotDate))].sort()

  const byDateStock = new Map<string, StockHoldingSnapshot>()
  for (const snapshot of snapshots) {
    byDateStock.set(`${snapshot.snapshotDate}__${snapshot.stockName}`, snapshot)
  }

  const data = dates.map((snapshotDate) => {
    const point: TrendPoint = { snapshotDate }
    for (const stockName of stockNames) {
      const snapshot = byDateStock.get(`${snapshotDate}__${stockName}`)
      point[stockName] = snapshot?.valuationAmount ?? 0
    }
    return point
  })

  return { data, stockNames }
}

export function StockHoldingTrendLineChart({
  snapshots,
}: StockHoldingTrendLineChartProps) {
  const { data, stockNames } = buildChartData(snapshots)
  // hover 중인 종목명만 툴팁에 표시하기 위한 상태. 라인/점에 마우스가 올라가면 설정된다.
  const [hoveredStockName, setHoveredStockName] = useState<string | null>(null)

  const config: ChartConfig = stockNames.reduce((acc, stockName, index) => {
    acc[stockName] = {
      label: stockName,
      color: CHART_COLOR_VARS[index % CHART_COLOR_VARS.length],
    }
    return acc
  }, {} as ChartConfig)

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        조회된 데이터가 없습니다.
      </p>
    )
  }

  const minWidth = Math.max(data.length * 80, 480)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {stockNames.map((stockName, index) => (
          <div key={stockName} className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-3.5 shrink-0 rounded-full"
              style={{
                backgroundColor: CHART_COLOR_VARS[index % CHART_COLOR_VARS.length],
              }}
            />
            <span>{stockName}</span>
          </div>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <DashboardChartContainer
          config={config}
          className="h-72"
          style={{ width: minWidth, minWidth: "100%" }}
        >
          <LineChart data={data} margin={{ left: 12, right: 12, top: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="snapshotDate"
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
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  label={label}
                  payload={payload?.filter(
                    (item) => item.dataKey === hoveredStockName
                  )}
                />
              )}
            />
            {stockNames.map((stockName, index) => (
              <Line
                key={stockName}
                dataKey={stockName}
                type="monotone"
                stroke={CHART_COLOR_VARS[index % CHART_COLOR_VARS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{
                  r: 6,
                  onMouseOver: () => setHoveredStockName(stockName),
                }}
                onMouseEnter={() => setHoveredStockName(stockName)}
              />
            ))}
          </LineChart>
        </DashboardChartContainer>
      </div>
    </div>
  )
}
