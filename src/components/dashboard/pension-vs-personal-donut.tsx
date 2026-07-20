import { DonutChart, type DonutChartDatum } from "@/components/charts/donut-chart"
import { calculateGroupTotals } from "@/lib/dummy-data"
import type { Account, AccountSnapshot } from "@/lib/types/account"

interface PensionVsPersonalDonutProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

const COLOR_BY_GROUP: Record<string, string> = {
  연금: "var(--chart-1)",
  개인투자: "var(--chart-3)",
}

export function PensionVsPersonalDonut({
  accounts,
  snapshots,
}: PensionVsPersonalDonutProps) {
  const groupTotals = calculateGroupTotals(accounts, snapshots)

  const data: DonutChartDatum[] = groupTotals.map((group) => ({
    label: group.accountType,
    value: group.currentAmount,
    colorVar: COLOR_BY_GROUP[group.accountType] ?? "var(--chart-5)",
  }))

  const totalCurrentAmount = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <DonutChart
      data={data}
      centerLabel="연금 vs 개인투자"
      centerValue={`${totalCurrentAmount.toLocaleString()}원`}
    />
  )
}
