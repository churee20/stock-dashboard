"use client"

import {
  ChartContainer as ShadcnChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface DashboardChartContainerProps {
  config: ChartConfig
  className?: string
  style?: React.CSSProperties
  children: React.ComponentProps<typeof ShadcnChartContainer>["children"]
}

export function DashboardChartContainer({
  config,
  className,
  style,
  children,
}: DashboardChartContainerProps) {
  return (
    <ShadcnChartContainer config={config} className={className} style={style}>
      {children}
    </ShadcnChartContainer>
  )
}

export { ChartTooltip, ChartTooltipContent }
export type { ChartConfig }
