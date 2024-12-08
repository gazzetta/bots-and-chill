export function calculateTakeProfitPrice(
  entryPrice: number,
  targetProfit: number
): number {
  return entryPrice * (1 + targetProfit / 100);
} 