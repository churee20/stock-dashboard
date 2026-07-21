import type { AccountType } from "@/lib/types/account"
import type { SheetAccountRow } from "@/lib/types/sheets"

// "1.투자 현황(현재)" 탭 컬럼 인덱스(0-base, 실측 확정값).
// 계좌명은 계좌의 첫 종목 행에만 등장하고, 계좌 합계는 "합 계" 라벨이 있는 행에 담긴다.
const COLUMN = {
  ACCOUNT_NAME: 1,
  PRINCIPAL_AMOUNT: 10,
  CURRENT_AMOUNT: 12,
  PROFIT_AMOUNT: 13,
  PROFIT_RATE: 14,
} as const

// 계좌 요약이 아닌 그룹 합산 행(개별 계좌로 취급하지 않음).
const GROUP_SUMMARY_KEYWORDS = ["연금(합계)", "개인 투자(합계)", "전체(합계)"]

// 계좌 요약 행을 나타내는 라벨(그룹 합산 행과 구분).
const ACCOUNT_SUMMARY_LABEL = "합 계"

// 시트에는 있지만 수집 대상에서 제외할 계좌(계좌명+계좌번호 조합으로 식별, 사용자 확정).
const EXCLUDED_ACCOUNTS = [{ accountName: "은퇴 투자", accountNoMasked: "삼성증권" }]

function isExcludedAccount(accountName: string, accountNoMasked: string): boolean {
  return EXCLUDED_ACCOUNTS.some(
    (excluded) =>
      excluded.accountName === accountName &&
      excluded.accountNoMasked === accountNoMasked
  )
}

// 연금 계좌로 분류되는 계좌명 접두어(실측 시트 표기 기준, 공백 포함)
const PENSION_ACCOUNT_NAMES = [
  "퇴직연금",
  "개인연금(기존)",
  "개인연금(신)",
  "DC 계좌",
  "퇴직연금(삼성)",
]

function resolveAccountType(accountName: string): AccountType {
  return PENSION_ACCOUNT_NAMES.some((name) => accountName.startsWith(name))
    ? "연금"
    : "개인투자"
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null
  const numeric = raw.replace(/[^0-9.-]/g, "")
  if (numeric === "" || numeric === "-") return null
  const parsed = Number(numeric)
  return Number.isNaN(parsed) ? null : parsed
}

// 계좌명 셀("퇴직연금\n(220-91-xxxx-757)")을 계좌명/계좌번호(마스킹)로 분리한다.
// 계좌번호 부분을 감싼 괄호는 제거해 다른 계좌(예: "220-91")와 표기를 통일한다.
function splitAccountNameCell(cell: string): {
  accountName: string
  accountNoMasked: string
} {
  const [namePart, noPart] = cell.split("\n")
  const accountNoMasked = (noPart?.trim() ?? "").replace(/^\(|\)$/g, "")
  return {
    accountName: namePart?.trim() ?? "",
    accountNoMasked,
  }
}

function isGroupSummaryRow(label: string): boolean {
  return GROUP_SUMMARY_KEYWORDS.some((keyword) => label.includes(keyword))
}

// "1.투자 현황(현재)" 탭 원시 행 배열을 계좌별 요약 SheetAccountRow[]로 변환하는 순수 함수.
// 계좌명은 첫 종목 행에서 확인해 유지하다가, "합 계" 행을 만나면 해당 계좌의 요약으로 확정한다.
// 그룹 합산 행(연금(합계)/개인 투자(합계)/전체(합계)), 투자금액을 파싱할 수 없는(빈 계좌) 행,
// EXCLUDED_ACCOUNTS에 명시된 계좌(사용자 확정)는 결과에서 제외한다.
export function parseInvestmentSheet(rows: string[][]): SheetAccountRow[] {
  const result: SheetAccountRow[] = []
  let currentAccountName = ""
  let currentAccountNoMasked = ""

  for (const row of rows) {
    const labelCell = row[COLUMN.ACCOUNT_NAME]?.trim() ?? ""

    if (labelCell === "" || isGroupSummaryRow(labelCell)) {
      continue
    }

    if (labelCell.includes("\n")) {
      const { accountName, accountNoMasked } = splitAccountNameCell(labelCell)
      currentAccountName = accountName
      currentAccountNoMasked = accountNoMasked
      continue
    }

    if (labelCell !== ACCOUNT_SUMMARY_LABEL || currentAccountName === "") {
      continue
    }

    if (isExcludedAccount(currentAccountName, currentAccountNoMasked)) {
      currentAccountName = ""
      currentAccountNoMasked = ""
      continue
    }

    const principalAmount = parseAmount(row[COLUMN.PRINCIPAL_AMOUNT])
    const currentAmount = parseAmount(row[COLUMN.CURRENT_AMOUNT])
    const profitAmount = parseAmount(row[COLUMN.PROFIT_AMOUNT])
    const profitRate = parseAmount(row[COLUMN.PROFIT_RATE])

    if (principalAmount === null || currentAmount === null) {
      currentAccountName = ""
      currentAccountNoMasked = ""
      continue
    }

    result.push({
      accountName: currentAccountName,
      accountNoMasked: currentAccountNoMasked,
      accountType: resolveAccountType(currentAccountName),
      principalAmount,
      currentAmount,
      profitAmount: profitAmount ?? 0,
      profitRate: profitRate ?? 0,
    })

    currentAccountName = ""
    currentAccountNoMasked = ""
  }

  return result
}
