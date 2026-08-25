export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatPercent(value: number, digits = 2): string {
  return `${Math.abs(value).toFixed(digits)}%`
}

// 금액 표시용. 소수점 이하는 절삭(반올림 아님)하고 천단위 구분자를 붙인다.
export function formatAmount(value: number): string {
  return Math.trunc(value).toLocaleString()
}
