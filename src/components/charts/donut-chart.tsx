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

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const renderRingLabel = (props: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    value?: number
  }) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value } = props
    if (
      total === 0 ||
      cx === undefined ||
      cy === undefined ||
      midAngle === undefined ||
      innerRadius === undefined ||
      outerRadius === undefined ||
      value === undefined
    ) {
      return null
    }

    const ratio = (value / total) * 100
    if (ratio < 5) return null

    const radius = innerRadius + (outerRadius - innerRadius) / 2
    const radian = (Math.PI / 180) * midAngle
    const x = cx + radius * Math.cos(-radian)
    const y = cy + radius * Math.sin(-radian)

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white text-xs font-medium"
      >
        {ratio.toFixed(1)}%
      </text>
    )
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="relative aspect-square h-64 w-64 shrink-0">
        <DashboardChartContainer config={config} className="h-full w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="label"
                  formatter={(value, name, item) => {
                    const ratio = total === 0 ? 0 : (Number(value) / total) * 100
                    const colorVar =
                      (item?.payload as DonutChartDatum | undefined)
                        ?.colorVar ?? item?.color
                    return (
                      <>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: colorVar }}
                        />
                        <span className="text-foreground">
                          {name} {Number(value).toLocaleString()}원 (
                          {ratio.toFixed(1)}%)
                        </span>
                      </>
                    )
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="60%"
              outerRadius="90%"
              strokeWidth={2}
              label={renderRingLabel}
              labelLine={false}
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
      <ul className="flex flex-col gap-1.5 text-xs">
        {data.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.colorVar }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
