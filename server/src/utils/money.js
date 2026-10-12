/**
 * VyaparAI Deterministic Money & Tax Engine
 * 
 * Rules:
 * 1. Authoritative currency values are ALWAYS stored and computed as integer minor units (Paise).
 *    Example: ₹ 250.50 = 25,050 Paise.
 * 2. Floating point calculations are rounded immediately to the nearest integer Paise.
 * 3. Never use raw floating-point arithmetic for balances, invoice totals, or taxes.
 */

export const Money = {
  /**
   * Convert Rupees (float or string) to integer Paise.
   * e.g., 250.75 -> 25075
   */
  toPaise(rupees) {
    if (rupees === null || rupees === undefined || isNaN(Number(rupees))) {
      return 0;
    }
    return Math.round(Number(rupees) * 100);
  },

  /**
   * Convert integer Paise to decimal Rupees.
   * e.g., 25075 -> 250.75
   */
  toRupees(paise) {
    if (!paise || isNaN(Number(paise))) return 0;
    return Number((Number(paise) / 100).toFixed(2));
  },

  /**
   * Format integer Paise into Indian Currency representation.
   * e.g., 25000000 -> "₹ 2,50,000.00"
   */
  formatINR(paise, includeSymbol = true) {
    const rupees = this.toRupees(paise);
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rupees);

    return includeSymbol ? `₹ ${formatted}` : formatted;
  },

  /**
   * Calculate tax amount in Paise given a taxable base in Paise and a tax percentage.
   * e.g., basePaise = 10000 (₹100), taxRate = 18 (%) -> 1800 Paise (₹18)
   */
  calculateTax(taxableBasePaise, taxRatePercent) {
    if (!taxableBasePaise || !taxRatePercent) return 0;
    return Math.round((Number(taxableBasePaise) * Number(taxRatePercent)) / 100);
  },

  /**
   * Calculate percentage discount amount in Paise.
   */
  calculateDiscount(subtotalPaise, discountPercent) {
    if (!subtotalPaise || !discountPercent) return 0;
    return Math.round((Number(subtotalPaise) * Number(discountPercent)) / 100);
  },

  /**
   * Calculate gross profit margin percentage.
   * Margin (%) = ((Selling Price - Cost Price) / Selling Price) * 100
   */
  calculateMarginPercent(sellingPricePaise, costPricePaise) {
    if (!sellingPricePaise || sellingPricePaise <= 0) return 0;
    const profit = Number(sellingPricePaise) - Number(costPricePaise || 0);
    return Number(((profit / Number(sellingPricePaise)) * 100).toFixed(2));
  },

  /**
   * Sum an array of integer Paise values safely.
   */
  sum(paiseArray) {
    if (!Array.isArray(paiseArray)) return 0;
    return paiseArray.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  },
};
