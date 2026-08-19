import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { AccountMonthlyView } from "@/components/investment-return/account-monthly-view"
import { StockHoldingRatioView } from "@/components/investment-return/stock-holding-ratio-view"
import { StockHoldingListView } from "@/components/investment-return/stock-holding-list-view"
import {
  getAccounts,
  getAccountSnapshots,
  getStockHoldingSnapshots,
} from "@/lib/supabase/queries"

export default async function InvestmentReturnPage() {
  const accounts = await getAccounts()
  const snapshots = await getAccountSnapshots()
  const stockHoldingSnapshots = await getStockHoldingSnapshots()

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">투자 수익</h1>
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">계좌별 월간 수익율</TabsTrigger>
          <TabsTrigger value="stock-ratio">종목별 비중</TabsTrigger>
          <TabsTrigger value="stock-list">종목별 변동 리스트</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly">
          <AccountMonthlyView accounts={accounts} snapshots={snapshots} />
        </TabsContent>
        <TabsContent value="stock-ratio">
          <StockHoldingRatioView snapshots={stockHoldingSnapshots} />
        </TabsContent>
        <TabsContent value="stock-list">
          <StockHoldingListView snapshots={stockHoldingSnapshots} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
