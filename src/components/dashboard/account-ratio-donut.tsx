import { DonutChart, type DonutChartDatum } from "@/components/charts/donut-chart"
import type { Account, AccountSnapshot } from "@/lib/types/account"

interface AccountRatioDonutProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

const COLOR_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function AccountRatioDonut({
  accounts,
  snapshots,
}: AccountRatioDonutProps) {
  const snapshotByAccountId = new Map(
    snapshots.map((snapshot) => [snapshot.accountId, snapshot])
  )

  const data: DonutChartDatum[] = accounts
    .map((account, index) => {
      const snapshot = snapshotByAccountId.get(account.id)
      if (!snapshot) return null

      return {
        label: account.accountName,
        value: snapshot.currentAmount,
        colorVar: COLOR_PALETTE[index % COLOR_PALETTE.length],
      }
    })
    .filter((item): item is DonutChartDatum => item !== null)

  const totalCurrentAmount = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <DonutChart
      data={data}
      centerLabel="전체 계좌 비중"
      centerValue={`${totalCurrentAmount.toLocaleString()}원`}
    />
  )
}
