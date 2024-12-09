import { Decimal } from 'decimal.js';

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function formatDecimal(value: Decimal | number | string, precision: number = 8): string {
  return new Decimal(value).toFixed(precision);
} 