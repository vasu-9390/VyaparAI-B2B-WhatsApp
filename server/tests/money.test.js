import { describe, it, expect } from 'vitest';
import { Money } from '../src/utils/money.js';

describe('Deterministic Money & Tax Calculations', () => {
  it('converts decimal Rupees to integer Paise accurately', () => {
    expect(Money.toPaise(250.75)).toBe(25075);
    expect(Money.toPaise('500.00')).toBe(50000);
    expect(Money.toPaise(0)).toBe(0);
    // Floating point challenge: 0.1 + 0.2 = 0.30000000000000004
    expect(Money.toPaise(0.1 + 0.2)).toBe(30);
  });

  it('converts integer Paise back to Rupees', () => {
    expect(Money.toRupees(25075)).toBe(250.75);
    expect(Money.toRupees(50000)).toBe(500);
    expect(Money.toRupees(0)).toBe(0);
  });

  it('formats Paise into Indian Rupee locale', () => {
    expect(Money.formatINR(25000000)).toBe('₹ 2,50,000.00');
    expect(Money.formatINR(5000, false)).toBe('50.00');
  });

  it('computes GST tax without floating point drift', () => {
    // ₹ 100 base with 18% GST -> ₹ 18 (1800 Paise)
    expect(Money.calculateTax(10000, 18)).toBe(1800);
    
    // ₹ 250 base with 12% GST -> ₹ 30 (3000 Paise)
    expect(Money.calculateTax(25000, 12)).toBe(3000);
    
    // ₹ 333.33 base with 5% GST -> Math.round((33333 * 5) / 100) = 1667 Paise (₹ 16.67)
    expect(Money.calculateTax(33333, 5)).toBe(1667);
  });

  it('calculates gross profit margins accurately', () => {
    // Selling price: ₹ 1,000 (100000 paise), Cost price: ₹ 750 (75000 paise)
    // Margin: ((1000 - 750) / 1000) * 100 = 25%
    expect(Money.calculateMarginPercent(100000, 75000)).toBe(25);

    // Selling price: ₹ 500 (50000 paise), Cost price: ₹ 400 (40000 paise)
    // Margin: 20%
    expect(Money.calculateMarginPercent(50000, 40000)).toBe(20);
  });
});
