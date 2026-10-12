import { Quotation, QUOTATION_STATUSES } from '../models/Quotation.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { Money } from '../utils/money.js';

export const DashboardController = {
  /**
   * GET /api/dashboard/summary
   * Overall metrics: enquiries, quotes by status, revenue, low stock
   */
  async getSummary(req, res, next) {
    try {
      const orgId = req.user.organizationId;

      const [
        totalCustomers,
        totalLeads,
        totalProducts,
        quotations,
        lowStockProducts,
      ] = await Promise.all([
        Customer.countDocuments({ organizationId: orgId, isActive: true }),
        Lead.countDocuments({ organizationId: orgId }),
        Product.countDocuments({ organizationId: orgId, isActive: true }),
        Quotation.find({ organizationId: orgId }),
        Product.find({
          organizationId: orgId,
          isActive: true,
          $expr: { $lte: ['$availableQuantity', '$reorderThreshold'] },
        }).limit(5),
      ]);

      const quotesByStatus = {
        DRAFT: 0,
        PENDING_APPROVAL: 0,
        APPROVED: 0,
        SENT: 0,
        ACCEPTED: 0,
        REJECTED: 0,
        EXPIRED: 0,
      };

      let acceptedRevenuePaise = 0;
      let pipelineRevenuePaise = 0;

      quotations.forEach((q) => {
        if (quotesByStatus[q.status] !== undefined) {
          quotesByStatus[q.status]++;
        }
        if (q.status === QUOTATION_STATUSES.ACCEPTED) {
          acceptedRevenuePaise += q.grandTotalPaise;
        } else if ([QUOTATION_STATUSES.SENT, QUOTATION_STATUSES.APPROVED].includes(q.status)) {
          pipelineRevenuePaise += q.grandTotalPaise;
        }
      });

      const totalQuotations = quotations.length;
      const conversionRate = totalQuotations > 0 ? Number(((quotesByStatus.ACCEPTED / totalQuotations) * 100).toFixed(1)) : 0;

      return sendSuccess(res, {
        kpis: {
          totalCustomers,
          totalLeads,
          totalProducts,
          totalQuotations,
          pendingApprovals: quotesByStatus.PENDING_APPROVAL,
          acceptedQuotations: quotesByStatus.ACCEPTED,
          sentQuotations: quotesByStatus.SENT,
          rejectedQuotations: quotesByStatus.REJECTED,
          conversionRate,
          acceptedRevenuePaise,
          acceptedRevenueINR: Money.toRupees(acceptedRevenuePaise),
          pipelineRevenuePaise,
          pipelineRevenueINR: Money.toRupees(pipelineRevenuePaise),
        },
        quotesByStatus,
        lowStockAlerts: lowStockProducts.map((p) => ({
          _id: p._id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          availableQuantity: p.availableQuantity,
          reorderThreshold: p.reorderThreshold,
          uom: p.uom,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/dashboard/sales
   * Sales timeline for charts
   */
  async getSalesTrends(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const quotations = await Quotation.find({
        organizationId: orgId,
        status: { $in: [QUOTATION_STATUSES.ACCEPTED, QUOTATION_STATUSES.SENT] },
      }).sort({ createdAt: 1 });

      // Group by date (last 7 days or sample dates)
      const dateMap = {};
      quotations.forEach((q) => {
        const dateKey = new Date(q.createdAt).toISOString().split('T')[0];
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = { date: dateKey, acceptedRevenue: 0, sentRevenue: 0, count: 0 };
        }
        if (q.status === QUOTATION_STATUSES.ACCEPTED) {
          dateMap[dateKey].acceptedRevenue += Money.toRupees(q.grandTotalPaise);
        } else {
          dateMap[dateKey].sentRevenue += Money.toRupees(q.grandTotalPaise);
        }
        dateMap[dateKey].count++;
      });

      const trendData = Object.values(dateMap);
      return sendSuccess(res, { trends: trendData });
    } catch (error) {
      next(error);
    }
  },
};
