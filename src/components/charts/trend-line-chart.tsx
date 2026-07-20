"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartTooltip,
  ChartTooltipContent,
  DashboardChartContainer,
  type ChartConfig,
} from "@/components/charts/chart-container"

export interface TrendLineSeriesConfig {
  key: string
  label: string
  colorVar: string
}

export interface TrendLineDataPoint {
  periodLabel: string
  [seriesKey: string]: string | number
}

interface TrendLineChartProps {
  data: TrendLineDataPoint[]
  series: TrendLineSeriesConfig[]
  yAxisMode: "amount" | "profitRate"
}

export function TrendLineChart({
  data,
  series,
  yAxisMode,
}: TrendLineChartProps) {
  const config: ChartConfig = series.reduce((acc, item) => {
    acc[item.key] = { label: item.label, color: item.colorVar }
    return acc
  }, {} as ChartConfig)

  return (
    <DashboardChartContainer config={config} className="h-64 w-full">
      <LineChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="periodLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: number) =>
            yAxisMode === "profitRate"
              ? `${value}%`
              : value.toLocaleString()
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((item) => (
          <Line
            key={item.key}
            dataKey={item.key}
            type="monotone"
            stroke={item.colorVar}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </DashboardChartContainer>
  )
}
