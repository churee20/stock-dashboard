import { PeriodViewContainer } from "@/components/period-view/period-view-container"
import { getAccounts, getAccountSnapshots } from "@/lib/supabase/queries"

export default async function MonthlyPage() {
  const accounts = await getAccounts()
  const snapshots = await getAccountSnapshots()

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">월별 실적</h1>
      <PeriodViewContainer
        accounts={accounts}
        snapshots={snapshots}
        granularity="monthly"
      />
    </div>
  );
}
