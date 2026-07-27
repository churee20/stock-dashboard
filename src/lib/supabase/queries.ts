import { createSupabaseServerClient } from "@/lib/supabase/client"
import type {
  AccountRow,
  AccountSnapshotRow,
  AssetClassSnapshotRow,
  DividendSnapshotRow,
} from "@/lib/types/database"
import type { Account, AccountSnapshot } from "@/lib/types/account"
import type { AssetClassSnapshot } from "@/lib/types/dashboard"
import type { DividendSnapshot } from "@/lib/types/dividend"
import {
  mapAccountRowToAccount,
  mapAssetClassSnapshotRowToItem,
  mapDividendSnapshotRowToItem,
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

// 특정 날짜(snapshot_date)의 계좌 스냅샷 전체를 조회한다. 알림용 전일 대비 계산에 사용.
export async function getSnapshotsByDate(
  date: string
): Promise<AccountSnapshot[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("account_snapshots")
    .select("*")
    .eq("snapshot_date", date)
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

// 가장 최근 snapshot_date의 자산군별 비중 스냅샷 전체를 조회한다.
export async function getLatestAssetClassSnapshots(): Promise<
  AssetClassSnapshot[]
> {
  const supabase = createSupabaseServerClient()

  const { data: latestRows, error: latestError } = await supabase
    .from("asset_class_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
  if (latestError) throw latestError

  const latestDate = (
    latestRows as Pick<AssetClassSnapshotRow, "snapshot_date">[]
  )[0]?.snapshot_date
  if (!latestDate) return []

  const { data, error } = await supabase
    .from("asset_class_snapshots")
    .select("*")
    .eq("snapshot_date", latestDate)
  if (error) throw error

  return (data as AssetClassSnapshotRow[]).map(mapAssetClassSnapshotRowToItem)
}

export async function getDividendSnapshots(): Promise<DividendSnapshot[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("dividend_snapshots").select("*")
  if (error) throw error
  return (data as DividendSnapshotRow[]).map(mapDividendSnapshotRowToItem)
}
