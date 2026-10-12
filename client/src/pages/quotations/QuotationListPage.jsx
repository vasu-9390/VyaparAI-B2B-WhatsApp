import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationApi } from '../../api/quotationApi.js';
import { orderApi } from '../../api/orderApi.js';
import { customerApi } from '../../api/customerApi.js';
import { productApi } from '../../api/productApi.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  ShoppingBag,
} from 'lucide-react';

export function QuotationListPage() {
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Queries
  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['quotations', statusFilter],
    queryFn: () => quotationApi.list({ status: statusFilter }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customerApi.list({ limit: 100 }),
    enabled: isCreateModalOpen,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productApi.list({ limit: 100 }),
    enabled: isCreateModalOpen,
  });

  // Create Quote Form State
  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', variantSku: '', quantity: 100, discountPercent: 0 }],
    shippingINR: 0,
    validityDays: 7,
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id) => quotationApi.approve(id, 'Approved via dashboard'),
    onSuccess: () => queryClient.invalidateQueries(['quotations']),
  });

  const sendMutation = useMutation({
    mutationFn: (id) => quotationApi.send(id),
    onSuccess: () => queryClient.invalidateQueries(['quotations']),
  });

  const acceptMutation = useMutation({
    mutationFn: (id) => quotationApi.accept(id),
    onSuccess: () => queryClient.invalidateQueries(['quotations']),
  });

  const convertOrderMutation = useMutation({
    mutationFn: (id) => orderApi.convertFromQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations']);
      queryClient.invalidateQueries(['orders']);
      alert('Sales Order created successfully! View in Sales Orders tab.');
    },
    onError: (err) => alert(`Error converting to order: ${err.message}`),
  });

  const createMutation = useMutation({
    mutationFn: (data) => quotationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations']);
      setIsCreateModalOpen(false);
      setFormData({
        customerId: '',
        items: [{ productId: '', variantSku: '', quantity: 100, discountPercent: 0 }],
        shippingINR: 0,
        validityDays: 7,
        notes: '',
      });
    },
    onError: (err) => setFormError(err.message),
  });

  // Handle Dynamic Line Items
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', variantSku: '', quantity: 50, discountPercent: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.customerId) {
      setFormError('Please select a customer');
      return;
    }
    if (formData.items.some((it) => !it.productId)) {
      setFormError('Please select a product for all line items');
      return;
    }

    createMutation.mutate({
      customerId: formData.customerId,
      items: formData.items.map((it) => ({
        productId: it.productId,
        variantSku: it.variantSku || '',
        quantity: Number(it.quantity) || 1,
        discountPercent: Number(it.discountPercent) || 0,
      })),
      shippingPaise: Math.round(Number(formData.shippingINR || 0) * 100),
      validityDays: Number(formData.validityDays) || 7,
      notes: formData.notes,
    });
  };

  const quotations = quotesData?.data || [];
  const customers = customersData?.data || [];
  const products = productsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quotation Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, preview, approve, and send GST-compliant PDF quotations with dynamic UPI payment instructions.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Draft New Quotation
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 w-fit text-xs font-medium">
        {[
          { key: '', label: 'All Quotations' },
          { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'SENT', label: 'Sent to Customer' },
          { key: 'ACCEPTED', label: 'Accepted' },
          { key: 'DRAFT', label: 'Drafts' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === tab.key
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> Loading quotations...
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No quotations found for this filter. Click "Draft New Quotation" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Quote #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items Summary</th>
                  <th className="px-5 py-3 text-right">Grand Total</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((quote) => (
                  <tr key={quote._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {quote.quotationNumber}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        v{quote.version} • {new Date(quote.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-900 block">{quote.customerId?.companyName}</span>
                      <span className="text-[11px] text-slate-500">{quote.customerId?.name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {quote.lineItems?.map((it) => `${it.quantity} ${it.uom} ${it.productName}`).join(', ')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      ₹ {(quote.grandTotalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge status={quote.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {/* View PDF */}
                      <button
                        onClick={() => setPdfPreviewUrl(`/api/quotations/${quote._id}/pdf`)}
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                        title="View & Download PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {/* Approve button (if pending approval and privileged) */}
                      {quote.status === 'PENDING_APPROVAL' && hasRole('SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER') && (
                        <button
                          onClick={() => approveMutation.mutate(quote._id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm"
                          title="Authorize Margin & Discount Exception"
                        >
                          Approve Quote
                        </button>
                      )}

                      {/* Send button (if ready to send) */}
                      {['APPROVED', 'DRAFT'].includes(quote.status) && (
                        <button
                          onClick={() => sendMutation.mutate(quote._id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm inline-flex items-center gap-1"
                          title="Generate PDF & Mark as Dispatched"
                        >
                          <Send className="w-3 h-3" /> Send
                        </button>
                      )}

                      {/* Customer Acceptance Button */}
                      {quote.status === 'SENT' && (
                        <button
                          onClick={() => acceptMutation.mutate(quote._id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-green-700 hover:bg-green-800 text-white rounded shadow-sm inline-flex items-center gap-1"
                          title="Record Customer Confirmation"
                        >
                          <CheckCircle className="w-3 h-3" /> Accepted
                        </button>
                      )}

                      {/* Convert to Order Button */}
                      {quote.convertedToOrderId ? (
                        <span className="px-2 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                          Order Created
                        </span>
                      ) : (['ACCEPTED', 'APPROVED'].includes(quote.status)) && (
                        <button
                          onClick={() => convertOrderMutation.mutate(quote._id)}
                          disabled={convertOrderMutation.isPending}
                          className="px-2 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm inline-flex items-center gap-1"
                          title="Convert to Confirmed Sales Order"
                        >
                          <ShoppingBag className="w-3 h-3" /> Create Order
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Quotation Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Draft B2B Quotation with GST & Margin Engine"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Customer
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName} ({c.name} - {c.whatsappPhone})
                </option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div className="space-y-2 border-t border-b border-slate-100 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Line Items</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="col-span-5">
                  <label className="block text-[10px] text-slate-500 font-semibold uppercase">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded bg-white"
                    required
                  >
                    <option value="">-- Product --</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (₹{p.defaultSellingPricePaise / 100})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <label className="block text-[10px] text-slate-500 font-semibold uppercase">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                    required
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-[10px] text-slate-500 font-semibold uppercase">Disc %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discountPercent}
                    onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                  />
                </div>

                <div className="col-span-1 text-right pt-4">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 font-semibold uppercase">Shipping / Freight (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.shippingINR}
                onChange={(e) => setFormData({ ...formData, shippingINR: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 font-semibold uppercase">Quote Validity (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={formData.validityDays}
                onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isLoading}>
              Calculate & Draft Quote
            </Button>
          </div>
        </form>
      </Modal>

      {/* PDF Preview Modal */}
      <Modal
        isOpen={Boolean(pdfPreviewUrl)}
        onClose={() => setPdfPreviewUrl(null)}
        title="Quotation PDF & UPI Bharat QR Preview"
        maxWidth="max-w-4xl"
      >
        {pdfPreviewUrl && (
          <div className="h-[70vh] w-full rounded-lg overflow-hidden border border-slate-200">
            <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />
          </div>
        )}
      </Modal>
    </div>
  );
}
