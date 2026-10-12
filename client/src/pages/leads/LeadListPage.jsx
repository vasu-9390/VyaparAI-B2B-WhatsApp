import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi } from '../../api/leadApi.js';
import { customerApi } from '../../api/customerApi.js';
import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Plus, MessageSquare, Phone, Calendar, Clock, Loader2 } from 'lucide-react';

export function LeadListPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [activeLeadNotes, setActiveLeadNotes] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: () => leadApi.list({ status: statusFilter }),
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, text }) => leadApi.addNote(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setNewNoteText('');
      setActiveLeadNotes(null);
    },
  });

  const leads = leadsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads & Enquiries Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Incoming customer enquiries from WhatsApp, trade visits, and sales channels.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 w-fit text-xs font-medium">
        {[
          { key: '', label: 'All Enquiries' },
          { key: 'NEW', label: 'New' },
          { key: 'CONTACTED', label: 'Contacted' },
          { key: 'QUOTATION_SENT', label: 'Quote Sent' },
          { key: 'NEGOTIATING', label: 'Negotiating' },
          { key: 'CONVERTED', label: 'Converted' },
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

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> Loading leads pipeline...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No leads found in this stage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Customer & Company</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Requested Items</th>
                  <th className="px-5 py-3">Assigned Rep</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Priority</th>
                  <th className="px-5 py-3 text-right">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-900 block">{lead.customerId?.companyName}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-600" /> {lead.customerId?.whatsappPhone} ({lead.customerId?.name})
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-600">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 max-w-xs truncate">
                      {lead.requestedProducts?.map((p) => p.query || `${p.quantity} units`).join(', ') || 'General Enquiry'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {lead.assignedTo?.name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge status={lead.status} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge status={lead.priority} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setActiveLeadNotes(lead)}
                        className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-[11px]"
                      >
                        Notes ({lead.notes?.length || 0})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <Modal
        isOpen={Boolean(activeLeadNotes)}
        onClose={() => setActiveLeadNotes(null)}
        title={`Lead Activity History — ${activeLeadNotes?.customerId?.companyName}`}
      >
        <div className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {activeLeadNotes?.notes?.map((n, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                <p className="text-slate-800">{n.text}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {n.authorName} • {new Date(n.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <textarea
              rows={2}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add activity note or follow-up remark..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                size="sm"
                variant="primary"
                disabled={!newNoteText.trim()}
                onClick={() => addNoteMutation.mutate({ id: activeLeadNotes._id, text: newNoteText })}
                loading={addNoteMutation.isLoading}
              >
                Log Note
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
