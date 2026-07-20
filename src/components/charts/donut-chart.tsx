"use client"

import { Cell, Pie, PieChart } from "recharts"

import {
  ChartTooltip,
  ChartTooltipContent,
  DashboardChartContainer,
  type ChartConfig,
} from "@/components/charts/chart-container"

export interface DonutChartDatum {
  label: string
  value: number
  colorVar: string
}

interface DonutChartProps {
  data: DonutChartDatum[]
  centerLabel?: string
  centerValue?: string
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const config: ChartConfig = data.reduce((acc, item) => {
    acc[item.label] = { label: item.label, color: item.colorVar }
    return acc
  }, {} as ChartConfig)

  return (
    <div className="relative">
      <DashboardChartContainer config={config} className="mx-auto aspect-square max-h-64">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="label" />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="60%"
            outerRadius="90%"
            strokeWidth={2}
          >
            {data.map((item) => (
              <Cell key={item.label} fill={item.colorVar} />
            ))}
          </Pie>
        </PieChart>
      </DashboardChartContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-lg font-semibold">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-muted-foreground text-xs">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
