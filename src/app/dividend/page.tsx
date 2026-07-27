import { DividendViewContainer } from "@/components/dividend/dividend-view-container"
import { getAccounts, getDividendSnapshots } from "@/lib/supabase/queries"

export default async function DividendPage() {
  const accounts = await getAccounts()
  const dividendSnapshots = await getDividendSnapshots()

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">배당실적</h1>
      <DividendViewContainer
        accounts={accounts}
        dividendSnapshots={dividendSnapshots}
      />
    </div>
  )
}
