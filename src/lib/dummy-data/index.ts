import { DUMMY_ACCOUNTS } from "@/lib/dummy-data/accounts"
import { generateSnapshots } from "@/lib/dummy-data/generate-snapshots"

export { DUMMY_ACCOUNTS } from "@/lib/dummy-data/accounts"
export { generateSnapshots } from "@/lib/dummy-data/generate-snapshots"
export {
  aggregateToWeekly,
  aggregateToMonthly,
  calculateGroupTotals,
} from "@/lib/dummy-data/aggregate"

export const DUMMY_SNAPSHOTS = generateSnapshots(DUMMY_ACCOUNTS)
