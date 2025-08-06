export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number | string): string {
  return new Intl.NumberFormat('en-PH').format(Number(value));
}