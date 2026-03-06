export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
