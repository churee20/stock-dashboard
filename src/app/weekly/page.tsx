import { PeriodViewContainer } from "@/components/period-view/period-view-container"
import { getAccounts, getAccountSnapshots } from "@/lib/supabase/queries"

export default async function WeeklyPage() {
  const accounts = await getAccounts()
  const snapshots = await getAccountSnapshots()

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">주별 추적</h1>
      <PeriodViewContainer
        accounts={accounts}
        snapshots={snapshots}
        granularity="weekly"
      />
    </div>
  );
}
