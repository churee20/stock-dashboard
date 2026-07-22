import type { AccountType } from "@/lib/types/account"

// Google Sheets "1.투자현황(현재)" 탭 한 행을 파싱한 중간 DTO입니다(PRD 6.1 원본 데이터 항목 기준).
// 합계 행(연금(합계)/개인 투자(합계)/전체(합계))은 파싱 단계에서 제외되고 개별 계좌 행만 이 타입으로 변환됩니다.
export interface SheetAccountRow {
  accountName: string
  accountNoMasked: string
  accountType: AccountType
  principalAmount: number
  currentAmount: number
  profitAmount: number
  profitRate: number
}

// Google Sheets "4.계좌별 비중" 탭 [전체 계좌 비중] 섹션 한 행을 파싱한 중간 DTO입니다.
// "합계" 라벨 행과 자산군명이 없는 행은 파싱 단계에서 제외됩니다.
export interface SheetAssetClassRow {
  assetClass: string
  currentAmount: number
}
