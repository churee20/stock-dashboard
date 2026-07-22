export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatPercent(value: number, digits = 2): string {
  return `${Math.abs(value).toFixed(digits)}%`
}
