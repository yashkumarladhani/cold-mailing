import React from 'react';
import { CampaignStats } from '../types';
import { Play, Pause, RotateCcw, AlertTriangle, Send, CheckCircle2, RefreshCw, Eye } from 'lucide-react';

interface Props {
  stats: CampaignStats;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSendTest: () => void;
  countdown: number; // 0 to 10
  currentRecipientEmail?: string;
  hasContacts: boolean;
  hasConfig: boolean;
}

export default function CampaignProgress({
  stats,
  isRunning,
  onStart,
  onPause,
  onReset,
  onSendTest,
  countdown,
  currentRecipientEmail,
  hasContacts,
  hasConfig
}: Props) {
  const percentage = stats.total > 0 ? Math.round(((stats.sent + stats.failed + stats.skipped) / stats.total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      
      {/* Header with Circular Progress Gauge & Status */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-between border-b border-slate-100 pb-4">
        {/* Progress gauge */}
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              className="stroke-slate-100"
              strokeWidth="6.5"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              className="stroke-indigo-600 transition-all duration-300"
              strokeWidth="6.5"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - percentage / 100)}
            />
          </svg>
          <div className="flex flex-col items-center justify-center z-10">
            <span className="text-xl font-black text-slate-900 leading-none">{percentage}%</span>
            <span className="text-[8px] uppercase font-bold text-slate-400 mt-1 tracking-wider">Sent</span>
          </div>
        </div>

        {/* Current Campaign Status Text and Alerts */}
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Campaign status</span>
          <div>
            {isRunning ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                Loop Active
              </span>
            ) : stats.pending > 0 && stats.sent > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                Loop Paused
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                System Idle
              </span>
            )}
          </div>

          {isRunning && countdown > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[10px] font-mono font-bold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              t - {countdown}s delay
            </div>
          )}

          {!isRunning && stats.total > 0 && stats.pending === 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Fully Completed
            </div>
          )}
        </div>
      </div>

      {/* Campaign Metrics list / 2-column grid to prevent any squishing */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Full-width total rows */}
        <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Recipients</span>
            <span className="block text-[9px] text-slate-400 mt-0.5">imported list size</span>
          </div>
          <span className="text-xl font-black text-slate-800 font-mono">{stats.total}</span>
        </div>

        {/* Sent safely */}
        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 flex flex-col justify-between">
          <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Sent (Inbox)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-black text-emerald-700 font-mono">{stats.sent}</span>
            <span className="text-[9px] text-emerald-500 font-bold uppercase">Safe</span>
          </div>
        </div>

        {/* Spam folder alert */}
        <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100 flex flex-col justify-between relative">
          <span className="block text-[9px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            Spam Folder
            {stats.spamCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-black text-amber-800 font-mono">{stats.spamCount || 0}</span>
            <span className="text-[9px] text-amber-600 font-bold uppercase">Spam</span>
          </div>
        </div>

        {/* Skipped */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Skipped</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-black text-slate-700 font-mono">{stats.skipped}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase">Bypass</span>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-red-50/50 rounded-xl p-3 border border-red-100 flex flex-col justify-between">
          <span className="block text-[9px] font-bold text-red-500 uppercase tracking-wider">Failed</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-black text-red-700 font-mono">{stats.failed}</span>
            <span className="text-[9px] text-red-400 font-bold uppercase">Error</span>
          </div>
        </div>
      </div>

      {/* Control buttons & automation switches */}
      <div className="space-y-2 pt-1">
        <div className="flex gap-2">
          {!isRunning ? (
            <button
              type="button"
              onClick={onStart}
              disabled={!hasContacts || !hasConfig}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Loop
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause Loop
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            title="Reset Campaign Progress"
            disabled={stats.sent + stats.failed + stats.skipped === 0}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onSendTest}
          disabled={!hasConfig}
          className="w-full px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-indigo-100 transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Send Test Outbound
        </button>
      </div>

      {/* Active Processing Recipient Badge */}
      {isRunning && currentRecipientEmail && (
        <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1.5 shadow-inner">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-[9px] uppercase font-black text-indigo-400 font-mono tracking-widest">Active Recipient</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          </div>
          <p className="font-mono font-bold truncate text-indigo-100">{currentRecipientEmail}</p>
          <p className="text-[9px] text-slate-400">Enforcing the standard 15-second delivery spacing</p>
        </div>
      )}

      {/* Warnings */}
      {!hasConfig && (
        <div className="p-3 bg-red-50 text-red-900 border border-red-100 rounded-xl text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Setup Required:</span> Enter your SMTP or Mailgun API Credentials in Settings to activate outbound campaigns.
          </div>
        </div>
      )}
    </div>
  );
}
