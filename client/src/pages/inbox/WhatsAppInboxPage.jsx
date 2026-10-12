import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  FileText,
  Mic,
  CheckCheck,
  User,
  Phone,
  AlertCircle,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';

export function WhatsAppInboxPage() {
  // Sample realistic threads representing Surat/Morbi B2B conversations
  const [threads, setThreads] = useState([
    {
      id: 'conv-1',
      customerName: 'Suresh Singhania',
      company: 'Singhania Silk Ahmedabad',
      phone: '+91 98765 01234',
      lastMessage: 'Bhai 200 piece blue 40 size chahiye, best rate kya doge?',
      time: '10:42 AM',
      unread: 1,
      aiIntent: 'QUOTATION_REQUEST',
      aiExtracted: {
        product: 'Denim Fabrics (Cotton Indigo)',
        variant: 'Blue / Size 40',
        quantity: 200,
        unit: 'piece',
        language: 'Hindi / Hinglish',
        confidence: 0.94,
        suggestedRateINR: 250,
      },
      messages: [
        {
          id: 'm1',
          sender: 'customer',
          text: 'Namaste Rajesh bhai, kal jo sample bheja tha denim ka wo pasand aaya.',
          time: '10:40 AM',
          type: 'text',
        },
        {
          id: 'm2',
          sender: 'customer',
          text: 'Bhai 200 piece blue 40 size chahiye, best rate kya doge?',
          time: '10:42 AM',
          type: 'text',
        },
      ],
    },
    {
      id: 'conv-2',
      customerName: 'Kunal Dave',
      company: 'Dave Hardware Rajkot',
      phone: '+91 98220 54321',
      lastMessage: '[Voice Note: 14s] "Morbi plant mate 50 box tiles dispatch karo"',
      time: 'Yesterday',
      unread: 0,
      aiIntent: 'ORDER_CONFIRMATION',
      aiExtracted: {
        product: 'Ceramic Vitrified Tiles 600x600',
        quantity: 50,
        unit: 'box',
        language: 'Gujarati',
        confidence: 0.91,
      },
      messages: [
        {
          id: 'm20',
          sender: 'business',
          text: 'Dear Kunal bhai, sharing quotation QT-2026-0038 for 50 boxes tiles. Total: ₹ 48,000 + GST.',
          time: 'Yesterday 3:15 PM',
          type: 'pdf',
          quoteNo: 'QT-2026-0038',
        },
        {
          id: 'm21',
          sender: 'customer',
          text: 'Audio note: "Morbi plant mate 50 box tiles dispatch karo, payment kal RTGS kari daisu."',
          time: 'Yesterday 4:20 PM',
          type: 'audio',
        },
      ],
    },
  ]);

  const [activeThreadId, setActiveThreadId] = useState('conv-1');
  const [draftReply, setDraftReply] = useState(
    'Namaste Suresh bhai! 200 pieces Blue 40 Indigo Denim available hai. Catalog rate ₹250/pc hai, aapke liye special wholesale rate ₹240/pc calculate karke formal PDF quote generate kiya hai.'
  );

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const handleSendMessage = () => {
    if (!draftReply.trim()) return;
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: 'business',
      text: draftReply,
      time: 'Just now',
      type: 'text',
    };

    setThreads((prev) =>
      prev.map((t) => (t.id === activeThreadId ? { ...t, messages: [...t.messages, newMsg] } : t))
    );
    setDraftReply('');
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Left Column: Conversations List */}
      <div className="w-80 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">WhatsApp Inbox</h2>
            <p className="text-[11px] text-emerald-600 font-medium">Meta Cloud API Live Stream</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            {threads.length} Active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {threads.map((thread) => {
            const isSelected = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 truncate">{thread.customerName}</span>
                  <span className="text-[10px] text-slate-400">{thread.time}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium truncate">{thread.company}</p>
                <p className="text-xs text-slate-500 truncate mt-1">{thread.lastMessage}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge status={thread.aiIntent} className="text-[9px]" />
                  {thread.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">
                      {thread.unread}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle Column: Chat History */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Chat Header */}
        <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{activeThread.customerName}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>{activeThread.company}</span> •
              <span className="text-emerald-700 font-medium">{activeThread.phone}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
              Assigned: Sales Rep
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeThread.messages.map((msg) => {
            const isCustomer = msg.sender === 'customer';
            return (
              <div key={msg.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isCustomer
                      ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                      : 'bg-emerald-600 text-white rounded-tr-none'
                  }`}
                >
                  {msg.type === 'audio' && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-200 font-semibold text-emerald-700">
                      <Mic className="w-4 h-4" /> Voice Note (Transcribed)
                    </div>
                  )}

                  {msg.type === 'pdf' && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded bg-emerald-700 text-white">
                      <FileText className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="font-bold">Quotation {msg.quoteNo}.pdf</p>
                        <p className="text-[10px] text-emerald-200">Branded PDF with UPI QR</p>
                      </div>
                    </div>
                  )}

                  <p>{msg.text}</p>
                  <span
                    className={`block text-[9px] mt-1.5 text-right ${
                      isCustomer ? 'text-slate-400' : 'text-emerald-100'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
          <input
            type="text"
            value={draftReply}
            onChange={(e) => setDraftReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type or approve AI draft reply..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <Button variant="primary" icon={Send} onClick={handleSendMessage}>
            Send
          </Button>
        </div>
      </div>

      {/* Right Column: AI Extraction Intelligence Drawer */}
      <div className="w-80 border-l border-slate-200 p-5 bg-white flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              AI Order Extractor
            </h4>
            <p className="text-[10px] text-slate-400">Powered by Gemini 2.0 Flash</p>
          </div>
        </div>

        {activeThread.aiExtracted ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Extracted Requirements
              </span>
              <div className="space-y-1">
                <p className="text-slate-600 font-medium">
                  Product: <strong className="text-slate-900">{activeThread.aiExtracted.product}</strong>
                </p>
                {activeThread.aiExtracted.variant && (
                  <p className="text-slate-600">
                    Variant: <strong className="text-slate-900">{activeThread.aiExtracted.variant}</strong>
                  </p>
                )}
                <p className="text-slate-600">
                  Quantity:{' '}
                  <strong className="text-emerald-700">
                    {activeThread.aiExtracted.quantity} {activeThread.aiExtracted.unit}
                  </strong>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Detected Language: <span className="font-medium text-slate-700">{activeThread.aiExtracted.language}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Model Confidence:</span>
                <span className="font-bold text-emerald-700">
                  {Math.round(activeThread.aiExtracted.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* AI Action Button */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Automated Actions
              </span>
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-between"
                icon={FileCheck}
                onClick={() => {
                  setDraftReply(
                    `Namaste ${activeThread.customerName}! Aapka 200 pcs Denim Blue 40 quote ready hai: ₹56,000 Total. PDF dispatch kar diya hai.`
                  );
                }}
              >
                <span>Draft Quotation Quote</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">
            No structured requirements extracted from this conversation yet.
          </p>
        )}
      </div>
    </div>
  );
}
