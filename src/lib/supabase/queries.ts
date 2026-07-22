import { createSupabaseServerClient } from "@/lib/supabase/client"
import type { AccountRow, AccountSnapshotRow } from "@/lib/types/database"
import type { Account, AccountSnapshot } from "@/lib/types/account"
import {
  mapAccountRowToAccount,
  mapSnapshotRowToSnapshot,
} from "@/lib/types/mappers"

export async function getAccounts(): Promise<Account[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("accounts").select("*")
  if (error) throw error
  return (data as AccountRow[]).map(mapAccountRowToAccount)
}

export async function getAccountSnapshots(): Promise<AccountSnapshot[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("account_snapshots").select("*")
  if (error) throw error
  return (data as AccountSnapshotRow[]).map(mapSnapshotRowToSnapshot)
}

export async function getLatestCollectedAt(): Promise<string | undefined> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("account_snapshots")
    .select("collected_at")
    .order("collected_at", { ascending: false })
    .limit(1)
  if (error) throw error
  return (data as Pick<AccountSnapshotRow, "collected_at">[])[0]?.collected_at
}
