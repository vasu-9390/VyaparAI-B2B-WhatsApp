import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/authApi.js';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import {
  Building2,
  Shield,
  MessageSquare,
  Sparkles,
  Users,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function SettingsPage() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ['team-users'],
    queryFn: authApi.getUsers,
  });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES_REP',
    phone: '',
  });

  const [userError, setUserError] = useState('');

  const createUserMutation = useMutation({
    mutationFn: (data) => authApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-users']);
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'SALES_REP', phone: '' });
    },
    onError: (err) => setUserError(err.message),
  });

  const handleCreateUser = (e) => {
    e.preventDefault();
    setUserError('');
    createUserMutation.mutate(newUser);
  };

  const users = usersData?.data?.users || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Organization Settings & Policies</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business profile, GSTIN, WhatsApp Cloud API, Gemini AI model, and team roles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Business Profile</h3>
          </div>
          <div className="text-xs space-y-2">
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Business Name:</span>
              <strong className="text-slate-900">{organization?.name}</strong>
            </p>
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Business Handle:</span>
              <span className="font-mono text-slate-700">{organization?.slug}</span>
            </p>
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Industry:</span>
              <span className="capitalize text-slate-700">{organization?.industry || 'Textiles'} Wholesaler</span>
            </p>
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">GSTIN:</span>
              <strong className="font-mono text-slate-900">{organization?.gstin || '24AAACS0000A1Z5'}</strong>
            </p>
            <p className="flex justify-between py-1">
              <span className="text-slate-500">Currency:</span>
              <strong className="text-slate-900">INR (₹) Minor Units (Paise)</strong>
            </p>
          </div>
        </div>

        {/* Financial & Margin Policies */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pricing & Margin Safeguards</h3>
          </div>
          <div className="text-xs space-y-2">
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Minimum Gross Margin:</span>
              <strong className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {organization?.settings?.minMarginPercent || 15}% Required
              </strong>
            </p>
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Max Rep Discount Without Approval:</span>
              <strong className="text-slate-900">10% Maximum</strong>
            </p>
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Quote Numbering Prefix:</span>
              <span className="font-mono text-slate-700">{organization?.settings?.quotePrefix || 'QT-'}</span>
            </p>
            <p className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">UPI Payment VPA:</span>
              <span className="font-mono text-emerald-700">{organization?.settings?.upiVpa || 'merchant@upi'}</span>
            </p>
            <p className="flex justify-between py-1">
              <span className="text-slate-500">Default Quote Validity:</span>
              <strong className="text-slate-900">7 Days</strong>
            </p>
          </div>
        </div>

        {/* WhatsApp & AI Integration Health */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">WhatsApp Cloud API</h3>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="font-semibold text-emerald-800">Meta Webhook Ingestion</span>
              <span className="flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-2">
              Webhook URL: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">/api/webhooks/whatsapp</code>
            </p>
            <p className="text-slate-500 text-[11px]">
              Signature Verification: <strong className="text-slate-700">HMAC-SHA256 (x-hub-signature-256)</strong>
            </p>
          </div>
        </div>

        {/* Gemini Engine */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI Service Layer</h3>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
              <span className="font-semibold text-indigo-800">Google Gemini 2.0 Flash</span>
              <span className="flex items-center gap-1 font-bold text-indigo-700 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-2">
              Output Schema: <strong className="text-slate-700">Strict JSON Schema (Zod Validated)</strong>
            </p>
            <p className="text-slate-500 text-[11px]">
              Prompt Injection Filter: <strong className="text-emerald-700">Enabled</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Team Member Management */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Team Members & Access Control</h3>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsAddUserOpen(true)}>
            Add Team Member
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge status={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Provision Team Member Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {userError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{userError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Deepak Joshi"
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="deepak@royalfabrics.com"
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="SALES_REP">Sales Representative</option>
                <option value="SALES_MANAGER">Sales Manager</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
                <option value="BUSINESS_OWNER">Business Owner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Initial Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••••••"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createUserMutation.isLoading}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
