import { PeriodViewContainer } from "@/components/period-view/period-view-container"
import { DUMMY_ACCOUNTS, DUMMY_SNAPSHOTS } from "@/lib/dummy-data"

export default function MonthlyPage() {
  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">월별 실적</h1>
      <PeriodViewContainer
        accounts={DUMMY_ACCOUNTS}
        snapshots={DUMMY_SNAPSHOTS}
        granularity="monthly"
      />
    </div>
  );
}
