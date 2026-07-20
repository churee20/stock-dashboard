import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountProfitRatioChart } from "@/components/dashboard/account-profit-ratio-chart"
import { AccountRatioBarList } from "@/components/dashboard/account-ratio-bar-list"
import { AccountRatioDonut } from "@/components/dashboard/account-ratio-donut"
import { DashboardDetailTable } from "@/components/dashboard/dashboard-detail-table"
import { PensionVsPersonalDonut } from "@/components/dashboard/pension-vs-personal-donut"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { DUMMY_ACCOUNTS, DUMMY_SNAPSHOTS } from "@/lib/dummy-data"
import { selectLatestSnapshots } from "@/lib/dummy-data/select-latest"

export default function DashboardPage() {
  const latestSnapshots = selectLatestSnapshots(DUMMY_ACCOUNTS, DUMMY_SNAPSHOTS)

  if (latestSnapshots.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">현재 실적</h1>
        <p className="text-muted-foreground mt-8 text-center text-sm">
          표시할 데이터가 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">현재 실적</h1>

      <SummaryCards accounts={DUMMY_ACCOUNTS} snapshots={DUMMY_SNAPSHOTS} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>연금 vs 개인투자 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <PensionVsPersonalDonut
              accounts={DUMMY_ACCOUNTS}
              snapshots={latestSnapshots}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>전체 계좌 자산 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountRatioDonut
              accounts={DUMMY_ACCOUNTS}
              snapshots={latestSnapshots}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>계좌별 현재금액 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountRatioBarList
              accounts={DUMMY_ACCOUNTS}
              snapshots={latestSnapshots}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>계좌별 수익금액 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountProfitRatioChart
              accounts={DUMMY_ACCOUNTS}
              snapshots={latestSnapshots}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>계좌별 상세 실적</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardDetailTable
            accounts={DUMMY_ACCOUNTS}
            snapshots={latestSnapshots}
          />
        </CardContent>
      </Card>
    </div>
  )
}
