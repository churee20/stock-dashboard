import { createSupabaseServerClient } from "@/lib/supabase/client"
import type {
  AccountRow,
  AccountSnapshotRow,
  AssetClassSnapshotRow,
  DividendSnapshotRow,
  StockHoldingSnapshotRow,
} from "@/lib/types/database"
import type { Account, AccountSnapshot } from "@/lib/types/account"
import type { AssetClassSnapshot } from "@/lib/types/dashboard"
import type { DividendSnapshot } from "@/lib/types/dividend"
import type { StockHoldingSnapshot } from "@/lib/types/stock-holding"
import {
  mapAccountRowToAccount,
  mapAssetClassSnapshotRowToItem,
  mapDividendSnapshotRowToItem,
  mapSnapshotRowToSnapshot,
  mapStockHoldingRowToItem,
} from "@/lib/types/mappers"

// Supabase(PostgREST)는 한 번의 select에 최대 1000행만 반환한다(max-rows 기본값).
// 스냅샷 테이블은 매일 누적되어 1000행을 넘으므로, range로 페이지를 나눠 전체 행을 모두 가져온다.
// 페이지 경계에서 행이 누락/중복되지 않도록 정렬 컬럼 + id(고유값) 순으로 정렬을 고정한다.
const PAGE_SIZE = 1000

async function selectAllRows<T>(
  table: string,
  orderColumns: string[] = []
): Promise<T[]> {
  const supabase = createSupabaseServerClient()
  const rows: T[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select("*")
    for (const column of [...orderColumns, "id"]) {
      query = query.order(column, { ascending: true })
    }
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) throw error

    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return rows
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("accounts").select("*")
  if (error) throw error
  return (data as AccountRow[]).map(mapAccountRowToAccount)
}

export async function getAccountSnapshots(): Promise<AccountSnapshot[]> {
  const rows = await selectAllRows<AccountSnapshotRow>("account_snapshots", [
    "snapshot_date",
  ])
  return rows.map(mapSnapshotRowToSnapshot)
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

// 기준일(date) 이전 스냅샷 중 가장 최근 snapshot_date의 계좌 스냅샷 전체를 조회한다.
// 주말/공휴일 등 휴장으로 전날 스냅샷이 없을 때, 알림의 전일 대비 계산이 직전 영업일과 비교하도록 한다.
export async function getLatestSnapshotsBefore(
  date: string
): Promise<AccountSnapshot[]> {
  const supabase = createSupabaseServerClient()
  const { data: latestDateRow, error: latestDateError } = await supabase
    .from("account_snapshots")
    .select("snapshot_date")
    .lt("snapshot_date", date)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestDateError) throw latestDateError
  if (!latestDateRow) return []

  return getSnapshotsByDate(
    (latestDateRow as Pick<AccountSnapshotRow, "snapshot_date">).snapshot_date
  )
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
  const rows = await selectAllRows<DividendSnapshotRow>("dividend_snapshots")
  return rows.map(mapDividendSnapshotRowToItem)
}

export async function getStockHoldingSnapshots(): Promise<
  StockHoldingSnapshot[]
> {
  const rows = await selectAllRows<StockHoldingSnapshotRow>(
    "stock_holding_snapshots",
    ["snapshot_date"]
  )
  return rows.map(mapStockHoldingRowToItem)
}

// 특정 날짜(snapshot_date)의 종목 스냅샷 전체를 조회한다.
export async function getStockHoldingSnapshotsByDate(
  date: string
): Promise<StockHoldingSnapshot[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("stock_holding_snapshots")
    .select("*")
    .eq("snapshot_date", date)
  if (error) throw error
  return (data as StockHoldingSnapshotRow[]).map(mapStockHoldingRowToItem)
}

// 가장 최근 snapshot_date의 종목 스냅샷 전체를 조회한다.
export async function getLatestStockHoldingSnapshots(): Promise<
  StockHoldingSnapshot[]
> {
  const supabase = createSupabaseServerClient()

  const { data: latestRows, error: latestError } = await supabase
    .from("stock_holding_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
  if (latestError) throw latestError

  const latestDate = (
    latestRows as Pick<StockHoldingSnapshotRow, "snapshot_date">[]
  )[0]?.snapshot_date
  if (!latestDate) return []

  return getStockHoldingSnapshotsByDate(latestDate)
}
