import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../../api/customerApi.js';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Plus, Search, Phone, Mail, Building, AlertCircle, Loader2 } from 'lucide-react';

export function CustomerListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customerApi.list({ search, limit: 100 }),
  });

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    whatsappPhone: '',
    email: '',
    gstin: '',
    category: 'WHOLESALER',
    creditDays: 30,
    creditLimitINR: 100000,
    notes: '',
  });

  const [formError, setFormError] = useState('');

  const addCustomerMutation = useMutation({
    mutationFn: (data) => customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        companyName: '',
        whatsappPhone: '',
        email: '',
        gstin: '',
        category: 'WHOLESALER',
        creditDays: 30,
        creditLimitINR: 100000,
        notes: '',
      });
    },
    onError: (err) => setFormError(err.message),
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    addCustomerMutation.mutate({
      name: formData.name,
      companyName: formData.companyName,
      whatsappPhone: formData.whatsappPhone.trim(),
      email: formData.email,
      gstin: formData.gstin,
      category: formData.category,
      creditDays: Number(formData.creditDays) || 30,
      creditLimitPaise: Math.round(Number(formData.creditLimitINR || 0) * 100),
      notes: formData.notes,
    });
  };

  const customers = customersData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer Directory & Credit Terms</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            B2B buyers, wholesalers, verified WhatsApp numbers, credit limits, and negotiated rules.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Add New Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, contact person, or WhatsApp phone..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No customers found. Click "Add New Customer" to register one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Company Name</th>
                  <th className="px-5 py-3">Contact Person</th>
                  <th className="px-5 py-3">WhatsApp Phone</th>
                  <th className="px-5 py-3">GSTIN</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Credit Limit</th>
                  <th className="px-5 py-3 text-right">Credit Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.companyName}</td>
                    <td className="px-5 py-3.5 text-slate-700">{c.name}</td>
                    <td className="px-5 py-3.5 font-medium text-emerald-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> {c.whatsappPhone}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">{c.gstin || 'Unregistered'}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      ₹ {(c.creditLimitPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600 font-medium">
                      {c.creditDays} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register B2B Customer & Credit Rules"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Company Name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Singhania Silk Stores"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Contact Person</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Suresh Singhania"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">WhatsApp Phone</label>
              <input
                type="tel"
                required
                value={formData.whatsappPhone}
                onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                placeholder="+919876501234"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="suresh@singhania.com"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="24AABCS1429B1ZX"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="WHOLESALER">Wholesaler</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="RETAILER">Retailer</option>
                <option value="MANUFACTURER">Manufacturer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Credit Limit (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.creditLimitINR}
                onChange={(e) => setFormData({ ...formData, creditLimitINR: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Credit Terms (Days)</label>
              <input
                type="number"
                min="0"
                value={formData.creditDays}
                onChange={(e) => setFormData({ ...formData, creditDays: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addCustomerMutation.isLoading}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
