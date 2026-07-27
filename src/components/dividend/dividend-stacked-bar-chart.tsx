"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartTooltip,
  ChartTooltipContent,
  DashboardChartContainer,
  type ChartConfig,
} from "@/components/charts/chart-container"
import type { Account } from "@/lib/types/account"
import type { DividendSnapshot } from "@/lib/types/dividend"

const CHART_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

interface DividendStackedBarChartProps {
  accounts: Account[]
  dividendSnapshots: DividendSnapshot[]
}

interface MonthlyChartPoint {
  monthLabel: string
  [accountName: string]: string | number
}

// 지급일(payment_date, "YYYY-MM-DD")에서 "YYYY-MM" 년월 라벨을 추출한다.
function toMonthLabel(paymentDate: string): string {
  return paymentDate.slice(0, 7)
}

function buildChartData(
  accounts: Account[],
  dividendSnapshots: DividendSnapshot[]
): { data: MonthlyChartPoint[]; accountNames: string[] } {
  const accountNameById = new Map(
    accounts.map((account) => [account.id, account.accountName])
  )

  const accountNames = [...new Set(accounts.map((a) => a.accountName))]

  const monthLabels = [
    ...new Set(dividendSnapshots.map((s) => toMonthLabel(s.paymentDate))),
  ].sort()

  const data = monthLabels.map((monthLabel) => {
    const point: MonthlyChartPoint = { monthLabel }
    for (const accountName of accountNames) {
      point[accountName] = 0
    }

    for (const snapshot of dividendSnapshots) {
      if (toMonthLabel(snapshot.paymentDate) !== monthLabel) continue
      const accountName = accountNameById.get(snapshot.accountId)
      if (!accountName) continue
      point[accountName] = (point[accountName] as number) + snapshot.dividendAmount
    }

    return point
  })

  return { data, accountNames }
}

export function DividendStackedBarChart({
  accounts,
  dividendSnapshots,
}: DividendStackedBarChartProps) {
  const { data, accountNames } = buildChartData(accounts, dividendSnapshots)

  const config: ChartConfig = accountNames.reduce((acc, accountName, index) => {
    acc[accountName] = {
      label: accountName,
      color: CHART_COLOR_VARS[index % CHART_COLOR_VARS.length],
    }
    return acc
  }, {} as ChartConfig)

  return (
    <DashboardChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 12, right: 12 }}>
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
          tickFormatter={(value: number) => value.toLocaleString()}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {accountNames.map((accountName, index) => (
          <Bar
            key={accountName}
            dataKey={accountName}
            stackId="dividend"
            fill={CHART_COLOR_VARS[index % CHART_COLOR_VARS.length]}
          />
        ))}
      </BarChart>
    </DashboardChartContainer>
  )
}
