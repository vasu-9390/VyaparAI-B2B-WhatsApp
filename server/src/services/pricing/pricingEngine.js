import { Product } from '../../models/Product.js';
import { Customer } from '../../models/Customer.js';
import { Money } from '../../utils/money.js';
import { AppError } from '../../middleware/errorHandler.js';

export const PricingEngine = {
  /**
   * Deterministically calculate quotation line items, taxes, discounts, margins, and approval requirements
   */
  async calculateQuotation({ organization, customerId, items = [], shippingPaise = 0, validityDays = 7 }) {
    if (!items || items.length === 0) {
      throw new AppError('At least one product line item is required to generate a quotation', 400, 'EMPTY_ITEMS');
    }

    const customer = await Customer.findOne({
      _id: customerId,
      organizationId: organization._id,
    });
    if (!customer) {
      throw new AppError('Customer not found in organization', 404, 'CUSTOMER_NOT_FOUND');
    }

    const validatedLineItems = [];
    let subtotalPaise = 0;
    let discountTotalPaise = 0;
    let taxTotalPaise = 0;
    let totalCostPaise = 0;
    let requiresApproval = false;
    const approvalReasons = [];

    const minMarginPolicy = organization.settings?.minMarginPercent ?? 15;
    const maxDiscountPolicy = organization.settings?.maxDiscountPercentWithoutApproval ?? 10;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        organizationId: organization._id,
      });

      if (!product || !product.isActive) {
        throw new AppError(`Product with ID '${item.productId}' is not available in catalog`, 404, 'PRODUCT_NOT_FOUND');
      }

      let selectedVariant = null;
      let sku = product.sku;
      let productName = product.name;
      let unitPricePaise = item.unitPricePaise || product.defaultSellingPricePaise;
      let unitCostPricePaise = product.costPricePaise || 0;
      let minFloorPricePaise = product.minSellingPricePaise || product.costPricePaise;

      // Handle variant details if requested
      if (item.variantSku && product.variants && product.variants.length > 0) {
        selectedVariant = product.variants.find((v) => v.sku === item.variantSku.toUpperCase());
        if (!selectedVariant) {
          throw new AppError(`Variant '${item.variantSku}' does not exist on product ${product.sku}`, 404, 'VARIANT_NOT_FOUND');
        }
        sku = selectedVariant.sku;
        productName = `${product.name} - ${selectedVariant.name}`;
        unitPricePaise = item.unitPricePaise || selectedVariant.sellingPricePaise;
        unitCostPricePaise = selectedVariant.costPricePaise || 0;
      }

      // Check customer-specific pricing rule if available
      const customerRule = customer.customPricingRules?.find(
        (r) => r.productId.toString() === product._id.toString()
      );
      if (customerRule) {
        if (customerRule.customPricePaise && !item.unitPricePaise) {
          unitPricePaise = customerRule.customPricePaise;
        } else if (customerRule.discountPercent && !item.discountPercent) {
          item.discountPercent = customerRule.discountPercent;
        }
      }

      // Check floor price violation
      if (unitPricePaise < minFloorPricePaise) {
        requiresApproval = true;
        approvalReasons.push(`Unit price ₹${Money.toRupees(unitPricePaise)} for ${sku} is below minimum floor price ₹${Money.toRupees(minFloorPricePaise)}`);
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);
      const discountPercent = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));

      if (discountPercent > maxDiscountPolicy) {
        requiresApproval = true;
        approvalReasons.push(`Discount of ${discountPercent}% on ${sku} exceeds maximum authorized discount of ${maxDiscountPolicy}%`);
      }

      // Line calculations
      const lineSubtotal = quantity * unitPricePaise;
      const discountAmount = Money.calculateDiscount(lineSubtotal, discountPercent);
      const taxableBase = Math.max(0, lineSubtotal - discountAmount);
      const taxRatePercent = product.taxRatePercent ?? 12;
      const lineTax = Money.calculateTax(taxableBase, taxRatePercent);
      const lineTotal = taxableBase + lineTax;
      const lineCost = quantity * unitCostPricePaise;

      subtotalPaise += lineSubtotal;
      discountTotalPaise += discountAmount;
      taxTotalPaise += lineTax;
      totalCostPaise += lineCost;

      validatedLineItems.push({
        productId: product._id,
        variantSku: item.variantSku || '',
        productName,
        sku,
        hsnCode: product.hsnCode || '',
        uom: product.uom || 'meter',
        quantity,
        unitPricePaise,
        unitCostPricePaise,
        discountPercent,
        discountAmountPaise: discountAmount,
        taxRatePercent,
        taxAmountPaise: lineTax,
        lineTotalPaise: lineTotal,
        lineCostPaise: lineCost,
      });
    }

    const netTaxableTotal = Math.max(0, subtotalPaise - discountTotalPaise);
    const grandTotalPaise = netTaxableTotal + taxTotalPaise + Number(shippingPaise || 0);

    // Calculate gross profit margin percentage: ((Revenue excl tax - Cost) / Revenue excl tax) * 100
    const overallMarginPercent = Money.calculateMarginPercent(netTaxableTotal, totalCostPaise);

    if (overallMarginPercent < minMarginPolicy) {
      requiresApproval = true;
      approvalReasons.push(`Total profit margin ${overallMarginPercent}% is below the organization minimum threshold of ${minMarginPolicy}%`);
    }

    const validityDaysActual = Number(validityDays) || organization.settings?.defaultQuoteValidityDays || 7;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDaysActual);

    return {
      lineItems: validatedLineItems,
      subtotalPaise,
      discountTotalPaise,
      taxTotalPaise,
      shippingPaise: Number(shippingPaise || 0),
      grandTotalPaise,
      totalCostPaise,
      overallMarginPercent,
      validityDays: validityDaysActual,
      validUntil,
      requiresApproval,
      approvalReason: approvalReasons.join('; '),
      status: requiresApproval ? 'PENDING_APPROVAL' : 'DRAFT',
    };
  },
};
