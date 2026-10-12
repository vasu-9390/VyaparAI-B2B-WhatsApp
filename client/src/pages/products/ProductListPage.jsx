import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../../api/productApi.js';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Plus, Search, Layers, AlertCircle, ArrowUpDown, Loader2, Download } from 'lucide-react';

export function ProductListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState(null);

  // Queries
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter],
    queryFn: () => productApi.list({ search, category: categoryFilter, limit: 100 }),
  });

  // Add Product Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Cotton Fabric',
    uom: 'meter',
    hsnCode: '5208',
    taxRatePercent: 12,
    costPriceINR: 180,
    defaultSellingPriceINR: 250,
    minSellingPriceINR: 200,
    availableQuantity: 500,
    reorderThreshold: 100,
  });

  // Stock Adjustment Form State
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 50,
    movementType: 'PURCHASE_RECEIPT',
    reason: 'Mill batch delivery',
  });

  const [formError, setFormError] = useState('');

  const addProductMutation = useMutation({
    mutationFn: (data) => productApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setIsAddModalOpen(false);
      setFormData({
        sku: '',
        name: '',
        category: 'Cotton Fabric',
        uom: 'meter',
        hsnCode: '5208',
        taxRatePercent: 12,
        costPriceINR: 180,
        defaultSellingPriceINR: 250,
        minSellingPriceINR: 200,
        availableQuantity: 500,
        reorderThreshold: 100,
      });
    },
    onError: (err) => setFormError(err.message),
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, data }) => productApi.adjustStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setStockModalProduct(null);
    },
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    addProductMutation.mutate({
      sku: formData.sku.toUpperCase(),
      name: formData.name,
      category: formData.category,
      uom: formData.uom,
      hsnCode: formData.hsnCode,
      taxRatePercent: Number(formData.taxRatePercent) || 12,
      costPricePaise: Math.round(Number(formData.costPriceINR) * 100),
      defaultSellingPricePaise: Math.round(Number(formData.defaultSellingPriceINR) * 100),
      minSellingPricePaise: Math.round(Number(formData.minSellingPriceINR) * 100),
      availableQuantity: Number(formData.availableQuantity) || 0,
      reorderThreshold: Number(formData.reorderThreshold) || 50,
    });
  };

  const products = productsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Products & Inventory Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage B2B catalog items, stock on-hand, variants, and HSN tax categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/products/export-csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </a>
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Add New Product
          </Button>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, product name, or category..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> Loading catalog...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No products match this query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Selling Rate</th>
                  <th className="px-5 py-3 text-right">Stock On-Hand</th>
                  <th className="px-5 py-3 text-right">Reserved</th>
                  <th className="px-5 py-3 text-center">GST Tax</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isLow = p.availableQuantity <= p.reorderThreshold;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{p.sku}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {p.name}
                        {p.variants?.length > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            {p.variants.length} configurable variants
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{p.category}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹ {(p.defaultSellingPricePaise / 100).toFixed(2)} / {p.uom}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-bold ${isLow ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {p.availableQuantity} {p.uom}
                        {isLow && <span className="block text-[10px] text-rose-500 font-normal">Low Stock</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500">
                        {p.reservedQuantity} {p.uom}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                          {p.taxRatePercent}% (HSN {p.hsnCode || 'N/A'})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setStockModalProduct(p)}
                          className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-[11px] inline-flex items-center gap-1"
                          title="Adjust stock and record inventory movement"
                        >
                          <ArrowUpDown className="w-3 h-3" /> Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Catalog Product with Pricing Floors"
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
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Product SKU</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="TX-COT-001"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Cotton Fabric"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Surat Pure Cotton 60x60 Cambric"
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">UOM</label>
              <select
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="meter">Meter</option>
                <option value="piece">Piece</option>
                <option value="roll">Roll</option>
                <option value="box">Box</option>
                <option value="kg">Kilogram</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">HSN Code</label>
              <input
                type="text"
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                placeholder="5208"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">GST Rate</label>
              <select
                value={formData.taxRatePercent}
                onChange={(e) => setFormData({ ...formData, taxRatePercent: Number(e.target.value) })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value={5}>5%</option>
                <option value={12}>12% (Standard Textile)</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.costPriceINR}
                onChange={(e) => setFormData({ ...formData, costPriceINR: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Selling Rate (₹)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.defaultSellingPriceINR}
                onChange={(e) => setFormData({ ...formData, defaultSellingPriceINR: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Floor Price (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.minSellingPriceINR}
                onChange={(e) => setFormData({ ...formData, minSellingPriceINR: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Initial Stock</label>
              <input
                type="number"
                min="0"
                value={formData.availableQuantity}
                onChange={(e) => setFormData({ ...formData, availableQuantity: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Reorder Alert Level</label>
              <input
                type="number"
                min="0"
                value={formData.reorderThreshold}
                onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addProductMutation.isLoading}>
              Save to Catalog
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={Boolean(stockModalProduct)}
        onClose={() => setStockModalProduct(null)}
        title={`Adjust Inventory — ${stockModalProduct?.name} (${stockModalProduct?.sku})`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Current Available Stock: <strong className="text-slate-900">{stockModalProduct?.availableQuantity} {stockModalProduct?.uom}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Quantity Change (+ for Receipt, - for Deduction)
            </label>
            <input
              type="number"
              value={stockAdjustment.quantity}
              onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Movement Type</label>
            <select
              value={stockAdjustment.movementType}
              onChange={(e) => setStockAdjustment({ ...stockAdjustment, movementType: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="PURCHASE_RECEIPT">Purchase Receipt (Stock In)</option>
              <option value="MANUAL_ADJUSTMENT">Manual Inventory Audit / Correction</option>
              <option value="RETURN">Customer Return / Exchange</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Reason for Ledger</label>
            <input
              type="text"
              value={stockAdjustment.reason}
              onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
              placeholder="Batch mill arrival, physical count adjustment..."
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setStockModalProduct(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                adjustStockMutation.mutate({
                  id: stockModalProduct._id,
                  data: stockAdjustment,
                })
              }
              loading={adjustStockMutation.isLoading}
            >
              Commit Adjustment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
