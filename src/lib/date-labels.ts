export function weekOfMonthLabel(date: Date) {
  const month = date.getMonth() + 1
  const nth = Math.ceil(date.getDate() / 7)
  const labels = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  return `${month}월 ${labels[nth - 1] ?? `${nth}번째`} 주`
}

export function compactDate(dateStr: string) {
  return dateStr.slice(5).replace('-', '.')
}
