"use client"

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartTooltip,
  ChartTooltipContent,
  DashboardChartContainer,
  type ChartConfig,
} from "@/components/charts/chart-container"

export interface AmountRateComboPoint {
  periodLabel: string
  amount: number
  profitRate: number
}

interface AmountRateComboChartProps {
  data: AmountRateComboPoint[]
}

const CONFIG: ChartConfig = {
  amount: { label: "기말평가액", color: "var(--chart-1)" },
  profitRate: { label: "수익률", color: "var(--chart-4)" },
}

export function AmountRateComboChart({ data }: AmountRateComboChartProps) {
  return (
    <DashboardChartContainer config={CONFIG} className="h-72 w-full">
      <ComposedChart data={data} margin={{ left: 12, right: 12, top: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="periodLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          yAxisId="amount"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={80}
          tickFormatter={(value: number) => value.toLocaleString()}
        />
        <YAxis
          yAxisId="profitRate"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={50}
          tickFormatter={(value: number) => `${value}%`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          yAxisId="amount"
          dataKey="amount"
          type="monotone"
          fill="var(--chart-1)"
          fillOpacity={0.2}
          stroke="var(--chart-1)"
          strokeWidth={2}
        />
        <Line
          yAxisId="profitRate"
          dataKey="profitRate"
          type="monotone"
          stroke="var(--chart-4)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </DashboardChartContainer>
  )
}
