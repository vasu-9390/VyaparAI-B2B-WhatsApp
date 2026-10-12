import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../api/orderApi.js';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  IndianRupee,
  CreditCard,
  Plus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

export function OrderListPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountRupees: '',
    method: 'UPI',
    transactionReference: '',
    notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, searchTerm],
    queryFn: () => orderApi.getOrders({ status: statusFilter, search: searchTerm }),
  });

  const orders = data?.data || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, cancelReason }) => orderApi.updateStatus(id, status, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, paymentData }) => orderApi.recordPayment(id, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowPaymentModal(false);
      setPaymentForm({ amountRupees: '', method: 'UPI', transactionReference: '', notes: '' });
    },
  });

  const handleStatusChange = (orderId, newStatus) => {
    let cancelReason = '';
    if (newStatus === 'CANCELLED') {
      cancelReason = prompt('Please enter cancellation reason (inventory will be restored):');
      if (!cancelReason) return;
    }
    updateStatusMutation.mutate({ id: orderId, status: newStatus, cancelReason });
  };

  const handleRecordPaymentSubmit = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amountPaise = Math.round(parseFloat(paymentForm.amountRupees) * 100);
    if (!amountPaise || amountPaise <= 0) return alert('Please enter a valid amount');

    recordPaymentMutation.mutate({
      id: selectedOrder._id,
      paymentData: {
        amountPaise,
        method: paymentForm.method,
        transactionReference: paymentForm.transactionReference,
        notes: paymentForm.notes,
      },
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      CONFIRMED: { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2 },
      PROCESSING: { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
      SHIPPED: { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck },
      DELIVERED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PackageCheck },
      CANCELLED: { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
    };
    const c = config[status] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock };
    const Icon = c.icon;
    return (
      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', c.bg)}>
        <Icon className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const config = {
      PAID: 'bg-emerald-100 text-emerald-800',
      PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
      PENDING: 'bg-rose-100 text-rose-800',
    };
    return (
      <span className={clsx('px-2 py-0.5 rounded text-[11px] font-semibold', config[status] || 'bg-slate-100 text-slate-700')}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Orders & Fulfillment</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time B2B orders with concurrency-locked inventory and UPI payment verification.
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          {['', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st || 'ALL'}
              onClick={() => setStatusFilter(st)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {st || 'All Orders'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Order #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
                <th className="px-6 py-4 text-right">Due Balance</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                    Loading sales orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No sales orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{ord.orderNumber}</span>
                      <span className="block text-[11px] text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900 block truncate max-w-[200px]">
                        {ord.customerId?.name || 'Customer'}
                      </span>
                      <span className="text-xs text-slate-500">{ord.customerId?.whatsappPhone}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(ord.status)}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {getPaymentBadge(ord.paymentStatus)}
                        <span className="block text-[11px] text-slate-500 font-mono">
                          ₹{((ord.amountPaidPaise || 0) / 100).toLocaleString('en-IN')} paid
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      ₹{(ord.grandTotalPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      {ord.dueAmountPaise === 0 ? (
                        <span className="text-emerald-600 font-semibold">Cleared</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">
                          ₹{(ord.dueAmountPaise / 100).toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {ord.paymentStatus !== 'PAID' && ord.status !== 'CANCELLED' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setPaymentForm({
                                amountRupees: ((ord.dueAmountPaise || 0) / 100).toString(),
                                method: 'UPI',
                                transactionReference: '',
                                notes: '',
                              });
                              setShowPaymentModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay
                          </button>
                        )}

                        {ord.status !== 'CANCELLED' && ord.status !== 'DELIVERED' && (
                          <select
                            value={ord.status}
                            onChange={(e) => handleStatusChange(ord._id, e.target.value)}
                            className="text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1 focus:outline-none font-medium text-slate-700 cursor-pointer"
                          >
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancel Order</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Payment</h3>
                <p className="text-xs text-slate-500">Order #{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amountRupees}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountRupees: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Due Balance: ₹{((selectedOrder.dueAmountPaise || 0) / 100).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI UTR 4291823901"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional reference note"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
