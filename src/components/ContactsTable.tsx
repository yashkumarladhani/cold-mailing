import React, { useState } from 'react';
import { Contact } from '../types';
import { Search, Filter, Trash2, Shield, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Props {
  contacts: Contact[];
  onClearAll: () => void;
  onRemoveContact: (id: string) => void;
}

export default function ContactsTable({ contacts, onClearAll, onRemoveContact }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Sent' | 'Failed' | 'Skipped'>('All');

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(search.toLowerCase()) || 
                          contact.email.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'All') return matchesSearch;
    return contact.status === filter && matchesSearch;
  });

  const getStatusBadge = (status: Contact['status'], placement?: Contact['placement']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
            Pending Queue
          </span>
        );
      case 'Sending':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-max">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
            Sending...
          </span>
        );
      case 'Sent':
        if (placement === 'Spam Folder') {
          return (
            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-red-100 text-red-700 border border-red-300 flex items-center gap-1 w-max animate-pulse" title="AI assessed high spam risk; email likely routed to Spam Folder.">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              Sent [SPAM]
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max" title="Delivered to Primary Inbox.">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Sent (Inbox)
          </span>
        );
      case 'Failed':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 w-max">
            <AlertCircle className="w-3 h-3 text-red-500" />
            Failed
          </span>
        );
      case 'Skipped':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max" title="Invalid or blank email format bypassed.">
            Bypassed / Empty
          </span>
        );
    }
  };

  const getSpamRiskBadge = (score?: number, status?: string) => {
    if (score === undefined) return <span className="text-gray-400 text-xs">—</span>;
    
    // Reverse score to show Deliverability probability
    const deliveryProb = Math.max(0, 100 - score);
    let classes = '';
    if (deliveryProb >= 85) {
      classes = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (deliveryProb >= 60) {
      classes = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      classes = 'bg-red-50 text-red-700 border-red-200';
    }

    return (
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${classes} w-max`}>
        <Shield className="w-3 h-3" />
        {deliveryProb}% Inbox
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Search and Filters panel */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipients by name, mail..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex bg-white rounded-xl border border-gray-200 p-0.5 text-xs font-semibold text-gray-500">
            {(['All', 'Pending', 'Sent', 'Failed', 'Skipped'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === tab ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={onClearAll}
            className="px-3 py-2 border border-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-500 bg-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear list
          </button>
        </div>
      </div>

      {/* Table grid */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
          <Search className="w-8 h-8 text-gray-300" />
          <p className="text-xs font-semibold">No recipients found</p>
          <p className="text-[10px] max-w-xs text-gray-400">Try importing contact spreadsheets or change active filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4">Contact Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Outbound Status</th>
                <th className="py-3 px-4">AI Deliverability</th>
                <th className="py-3 px-4">Timeline / Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredContacts.map(contact => (
                <tr 
                  key={contact.id}
                  className={`hover:bg-gray-50/50 transition-all ${
                    contact.status === 'Sending' ? 'bg-indigo-50/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    <div className="flex flex-col">
                      <span>{contact.name}</span>
                      {contact.extraData && Object.keys(contact.extraData).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(contact.extraData).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-600">
                    {contact.email || <span className="text-amber-500 italic">No address found</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(contact.status, contact.placement)}
                  </td>
                  <td className="py-3.5 px-4">
                    {getSpamRiskBadge(contact.spamRiskScore, contact.spamRiskStatus)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">
                    {contact.sentAt && (
                      <span className="block text-[10px] font-mono text-gray-400">
                        {contact.sentAt}
                      </span>
                    )}
                    {contact.messageId && (
                      <span className="block text-[9px] font-mono text-indigo-600 font-semibold truncate max-w-[150px]">
                        ID: {contact.messageId}
                      </span>
                    )}
                    {contact.errorMessage && (
                      <span className="block text-[10px] text-red-600 font-medium max-w-[180px] leading-tight">
                        Error: {contact.errorMessage}
                      </span>
                    )}
                    {!contact.sentAt && !contact.errorMessage && (
                      <span className="text-gray-400 italic">In queue</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onRemoveContact(contact.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-all"
                      title="Remove from campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-400 font-mono">
        <Info className="w-3.5 h-3.5" />
        <span>List displays {filteredContacts.length} of {contacts.length} total campaign items. Auto-saves locally.</span>
      </div>
    </div>
  );
}
