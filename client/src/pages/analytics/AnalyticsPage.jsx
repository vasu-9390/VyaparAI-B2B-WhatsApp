import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { KpiCard } from '../../components/common/KpiCard.jsx';
import { TrendingUp, Users, FileCheck, IndianRupee } from 'lucide-react';

export function AnalyticsPage() {
  const channelData = [
    { name: 'WhatsApp Direct', value: 68, color: '#16a34a' },
    { name: 'Phone Calls', value: 18, color: '#3b82f6' },
    { name: 'Referral & Trade', value: 14, color: '#a855f7' },
  ];

  const topProducts = [
    { name: 'Pure Georgette Printed Saree', salesINR: 420000, volume: '280 pieces' },
    { name: 'Surat Premium Indigo Denim 12oz', salesINR: 350000, volume: '1,400 meters' },
    { name: 'Mulberry Silk Fabric', salesINR: 280000, volume: '1,120 meters' },
    { name: 'Cotton 60x60 Cambric Grey', salesINR: 195000, volume: '1,300 meters' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">B2B Sales Analytics & Intelligence</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quotation conversion funnels, top moving SKUs, and sales representative performance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Conversion Rate" value="73.5%" subtitle="+8.2% vs last month" icon={TrendingUp} color="emerald" />
        <KpiCard title="Avg. Order Value" value="₹ 64,800" subtitle="Per accepted quote" icon={IndianRupee} color="purple" />
        <KpiCard title="WhatsApp Leads" value="142" subtitle="Ingested & parsed" icon={Users} color="blue" />
        <KpiCard title="Quotes Accepted" value="104" subtitle="Under 60s turnaround" icon={FileCheck} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Channels */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            Enquiry Channel Breakdown
          </h3>
          <p className="text-xs text-slate-500 mb-4">Origin of B2B buyer enquiries</p>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-xs">
            {channelData.map((c) => (
              <div key={c.name} className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
                <span className="font-bold text-slate-900">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Moving Products */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            Top Selling Products by Revenue
          </h3>
          <p className="text-xs text-slate-500 mb-4">Highest grossing catalog items this month</p>

          <div className="space-y-4">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{p.name}</span>
                  <span className="text-[11px] text-slate-500">{p.volume} dispatched</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-700 block text-sm">
                    ₹ {p.salesINR.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400">GST Excluded</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
