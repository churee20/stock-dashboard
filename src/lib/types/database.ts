// Supabase accounts/account_snapshots 테이블의 Row 타입입니다(snake_case, DB 컬럼명 그대로).
// 애플리케이션 레이어(camelCase)는 src/lib/types/account.ts를 사용하고,
// Row → 애플리케이션 타입 변환은 src/lib/types/mappers.ts를 참고하세요.

export interface AccountRow {
  id: string
  account_name: string
  account_no_masked: string
  account_type: string
  created_at: string
}

export interface AccountSnapshotRow {
  id: string
  account_id: string
  snapshot_date: string
  principal_amount: number
  current_amount: number
  profit_amount: number
  profit_rate: number
  collected_at: string
}
