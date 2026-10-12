import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboardApi.js';
import { KpiCard } from '../../components/common/KpiCard.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import {
  FileSpreadsheet,
  AlertTriangle,
  IndianRupee,
  Users,
  CheckCircle2,
  TrendingUp,
  Plus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: salesData } = useQuery({
    queryKey: ['dashboard-sales'],
    queryFn: dashboardApi.getSalesTrends,
  });

  const kpis = data?.data?.kpis || {
    totalLeads: 0,
    pendingApprovals: 0,
    acceptedRevenueINR: 0,
    pipelineRevenueINR: 0,
    totalQuotations: 0,
    conversionRate: 0,
  };

  const lowStock = data?.data?.lowStockAlerts || [];
  const statusCounts = data?.data?.quotesByStatus || {};

  // Sample or API chart data
  const chartData = salesData?.data?.trends?.length
    ? salesData.data.trends
    : [
      { date: 'Mon', acceptedRevenue: 45000, sentRevenue: 60000 },
      { date: 'Tue', acceptedRevenue: 72000, sentRevenue: 95000 },
      { date: 'Wed', acceptedRevenue: 110000, sentRevenue: 140000 },
      { date: 'Thu', acceptedRevenue: 98000, sentRevenue: 125000 },
      { date: 'Fri', acceptedRevenue: 165000, sentRevenue: 210000 },
      { date: 'Sat', acceptedRevenue: 190000, sentRevenue: 230000 },
    ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">VyaparAI vijaybanadru</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" /> WhatsApp Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time B2B quotation workflows, AI message parsing, and inventory intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={MessageSquare}
            onClick={() => navigate('/inbox')}
          >
            WhatsApp Inbox
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/quotations')}
          >
            New Quotation
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Active Enquiries"
          value={kpis.totalLeads}
          subtitle="Customer WhatsApp threads"
          icon={Users}
          color="blue"
        />
        <KpiCard
          title="Pending Approvals"
          value={kpis.pendingApprovals}
          subtitle="Margin & discount guards"
          icon={AlertTriangle}
          color="amber"
        />
        <KpiCard
          title="Confirmed Revenue"
          value={`₹ ${Number(kpis.acceptedRevenueINR || 0).toLocaleString('en-IN')}`}
          subtitle="Accepted B2B orders"
          icon={CheckCircle2}
          color="emerald"
        />
        <KpiCard
          title="Pipeline Value"
          value={`₹ ${Number(kpis.pipelineRevenueINR || 0).toLocaleString('en-IN')}`}
          subtitle="Sent & approved quotes"
          icon={IndianRupee}
          color="purple"
        />
        <KpiCard
          title="Total Quotes"
          value={kpis.totalQuotations}
          subtitle="Automated & drafted"
          icon={FileSpreadsheet}
          color="blue"
        />
        <KpiCard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          subtitle="Quote to confirmed order"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Charts & Status Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Revenue & Quotation Dispatch (INR)
              </h3>
              <p className="text-xs text-slate-500">Confirmed orders vs active dispatched quotations</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="sentRevenue" name="Sent Quotes (₹)" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="acceptedRevenue" name="Accepted Orders (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quotation Status Health */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Quotation Pipeline Stages
            </h3>
            <p className="text-xs text-slate-500 mb-4">Active quotation lifecycle counts</p>

            <div className="space-y-3">
              {[
                { status: 'ACCEPTED', label: 'Accepted by Customer', count: statusCounts.ACCEPTED || 0, color: 'bg-emerald-500' },
                { status: 'SENT', label: 'Sent & Awaiting Confirmation', count: statusCounts.SENT || 0, color: 'bg-blue-500' },
                { status: 'PENDING_APPROVAL', label: 'Pending Manager Approval', count: statusCounts.PENDING_APPROVAL || 0, color: 'bg-amber-500' },
                { status: 'APPROVED', label: 'Approved (Ready to Send)', count: statusCounts.APPROVED || 0, color: 'bg-emerald-400' },
                { status: 'DRAFT', label: 'Drafts in Progress', count: statusCounts.DRAFT || 0, color: 'bg-slate-400' },
                { status: 'REJECTED', label: 'Customer Rejected', count: statusCounts.REJECTED || 0, color: 'bg-rose-400' },
              ].map((item) => (
                <div key={item.status} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="text-slate-700 font-medium">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => navigate('/quotations')}
          >
            Review All Quotations
          </Button>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Inventory Low-Stock Alerts
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {lowStock.length} items below reorder threshold
          </span>
        </div>

        {lowStock.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            All inventory items are currently above their reorder thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Available Stock</th>
                  <th className="px-5 py-3 text-right">Reorder Threshold</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStock.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{prod.sku}</td>
                    <td className="px-5 py-3.5 text-slate-700">{prod.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{prod.category}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600">
                      {prod.availableQuantity} {prod.uom}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600">
                      {prod.reorderThreshold} {prod.uom}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        REORDER NEEDED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
