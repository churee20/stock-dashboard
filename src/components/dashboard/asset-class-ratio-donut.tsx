import { DonutChart, type DonutChartDatum } from "@/components/charts/donut-chart"
import type { AssetClassSnapshot } from "@/lib/types/dashboard"

interface AssetClassRatioDonutProps {
  snapshots: AssetClassSnapshot[]
}

const COLOR_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function AssetClassRatioDonut({ snapshots }: AssetClassRatioDonutProps) {
  const data: DonutChartDatum[] = snapshots.map((snapshot, index) => ({
    label: snapshot.assetClass,
    value: snapshot.currentAmount,
    colorVar: COLOR_PALETTE[index % COLOR_PALETTE.length],
  }))

  const totalCurrentAmount = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <DonutChart
      data={data}
      centerLabel="전체 계좌 비중"
      centerValue={`${totalCurrentAmount.toLocaleString()}원`}
    />
  )
}
