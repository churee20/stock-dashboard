import { createSupabaseServerClient } from "@/lib/supabase/client"
import type { AccountRow } from "@/lib/types/database"
import type { SheetAccountRow } from "@/lib/types/sheets"
import {
  mapSheetRowToAccountInsert,
  mapSheetRowToSnapshotInsert,
} from "@/lib/types/mappers"

export interface CollectResult {
  accountCount: number
  newAccountCount: number
  upsertedSnapshotCount: number
}

// 시트에 등장한 계좌명을 기존 accounts와 매칭하고, 없는 계좌는 신규 등록한다.
// 반환값: 계좌명 -> account id 매핑
export async function syncAccounts(
  sheetRows: SheetAccountRow[]
): Promise<{ accountIdByName: Map<string, string>; newAccountCount: number }> {
  const supabase = createSupabaseServerClient()

  const { data: existingRows, error: selectError } = await supabase
    .from("accounts")
    .select("*")
  if (selectError) throw selectError

  const accountIdByName = new Map<string, string>(
    (existingRows as AccountRow[]).map((row) => [row.account_name, row.id])
  )

  const newSheetRows = sheetRows.filter(
    (row) => !accountIdByName.has(row.accountName)
  )

  if (newSheetRows.length === 0) {
    return { accountIdByName, newAccountCount: 0 }
  }

  const insertPayload = newSheetRows.map(mapSheetRowToAccountInsert)
  const { data: insertedRows, error: insertError } = await supabase
    .from("accounts")
    .insert(insertPayload)
    .select("*")
  if (insertError) throw insertError

  for (const row of insertedRows as AccountRow[]) {
    accountIdByName.set(row.account_name, row.id)
  }

  return { accountIdByName, newAccountCount: insertedRows.length }
}

// account_snapshots에 (account_id, snapshot_date) 기준 upsert를 수행한다(PRD 6.3: 동일 계좌+동일 수집일은 갱신).
export async function upsertSnapshots(
  accountIdByName: Map<string, string>,
  sheetRows: SheetAccountRow[],
  snapshotDate: string,
  collectedAt: string
): Promise<{ upserted: number }> {
  const supabase = createSupabaseServerClient()

  const payload = sheetRows.map((row) => {
    const accountId = accountIdByName.get(row.accountName)
    if (!accountId) {
      throw new Error(`계좌 ID를 찾을 수 없습니다: ${row.accountName}`)
    }
    return mapSheetRowToSnapshotInsert(row, accountId, snapshotDate, collectedAt)
  })

  const { error } = await supabase
    .from("account_snapshots")
    .upsert(payload, { onConflict: "account_id,snapshot_date" })
  if (error) throw error

  return { upserted: payload.length }
}

// Google Sheets에서 읽은 계좌 데이터를 Supabase에 반영하는 진입점.
export async function collectFromSheet(
  sheetRows: SheetAccountRow[]
): Promise<CollectResult> {
  const now = new Date()
  const snapshotDate = now.toISOString().slice(0, 10)
  const collectedAt = now.toISOString()

  const { accountIdByName, newAccountCount } = await syncAccounts(sheetRows)
  const { upserted } = await upsertSnapshots(
    accountIdByName,
    sheetRows,
    snapshotDate,
    collectedAt
  )

  return {
    accountCount: accountIdByName.size,
    newAccountCount,
    upsertedSnapshotCount: upserted,
  }
}
