import React, { useState } from 'react';
import { EmailTemplate, SpamCheckResult, Contact, OpenAIConfig, GeminiConfig } from '../types';
import { FileText, Sparkles, AlertTriangle, CheckCircle, Shield, RefreshCw, Eye, Keyboard, ArrowRight } from 'lucide-react';
import { safeFetchJSON } from '../lib/apiHelper';

interface Props {
  template: EmailTemplate;
  onChange: (template: EmailTemplate) => void;
  firstContact?: Contact;
  openAIConfig: OpenAIConfig;
  geminiConfig: GeminiConfig;
}

export default function TemplateEditor({ template, onChange, firstContact, openAIConfig, geminiConfig }: Props) {
  const [checkingSpam, setCheckingSpam] = useState(false);
  const [optimizingTemplate, setOptimizingTemplate] = useState(false);
  const [spamResult, setSpamResult] = useState<SpamCheckResult | null>(null);
  const [spamError, setSpamError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const updateField = (field: keyof EmailTemplate, value: any) => {
    onChange({ ...template, [field]: value });
  };

  // Run the AI Spam Analysis
  const runSpamAnalysis = async () => {
    if (!template.subject.trim() || !template.body.trim()) {
      setSpamError("Please fill in both Subject and Body templates to check.");
      return;
    }

    setCheckingSpam(true);
    setSpamError(null);
    setSpamResult(null);

    try {
      const provider = template.aiProvider || 'gemini';
      const endpoint = provider === 'gemini' ? '/api/gemini/spam-check' : '/api/openai/spam-check';
      const data = await safeFetchJSON(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject,
          body: template.body,
          apiKey: provider === 'gemini' ? geminiConfig.apiKey : openAIConfig.apiKey
        })
      });

      setSpamResult(data);
    } catch (err: any) {
      setSpamError(err.message || "Could not analyze spam rating. Check your network or API settings.");
    } finally {
      setCheckingSpam(false);
    }
  };

  // Auto-optimize template to remove spammy keywords
  const optimizeTemplateWithAI = async () => {
    if (!template.subject.trim() || !template.body.trim()) {
      alert("Please enter both a Subject and Body template to let AI optimize them.");
      return;
    }

    if (!window.confirm("This will automatically rewrite your Subject and Body templates using advanced Deliverability guidelines. This removes spam triggers, balances the tone, and maximizes your chances of landing in the Primary Inbox. Do you want to continue?")) {
      return;
    }

    setOptimizingTemplate(true);
    try {
      const provider = template.aiProvider || 'gemini';
      const endpoint = provider === 'gemini' ? '/api/gemini/optimize-template' : '/api/openai/optimize-template';
      const data = await safeFetchJSON(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject,
          body: template.body,
          apiKey: provider === 'gemini' ? geminiConfig.apiKey : openAIConfig.apiKey
        })
      });

      if (data.subject && data.body) {
        onChange({
          ...template,
          subject: data.subject,
          body: data.body
        });
        alert("Success! Your email template is now fully optimized for 100% Primary Inbox Placement! Press OK to run a fresh assessment check.");
        setTimeout(() => {
          runSpamAnalysis();
        }, 300);
      } else {
        throw new Error("Could not parse optimized copy from the AI engine.");
      }
    } catch (err: any) {
      alert(`Optimization error: ${err.message}`);
    } finally {
      setOptimizingTemplate(false);
    }
  };

  // Helper to substitute placeholders for the visual preview
  const getSubstitutedContent = (text: string) => {
    if (!text) return '';
    let result = text;
    
    // Default placeholder maps
    const replacementMap: Record<string, string> = {
      name: firstContact?.name || 'Rahul Kumar',
      email: firstContact?.email || 'rahul@example.com',
    };

    // Add extra data keys
    if (firstContact?.extraData) {
      Object.entries(firstContact.extraData).forEach(([key, val]) => {
        replacementMap[key.toLowerCase()] = val;
      });
    }

    // Replace placeholders matching {{variable_name}} or {{variable_name | default}}
    result = result.replace(/\{\{\s*([^}|]+?)(?:\s*\|\s*([^}]+?))?\s*\}\}/g, (match, key, defaultValue) => {
      const cleanKey = key.trim().toLowerCase();
      if (replacementMap[cleanKey] !== undefined) {
        return replacementMap[cleanKey];
      }
      return defaultValue ? defaultValue.trim() : match;
    });

    return result;
  };

  const previewSubject = getSubstitutedContent(template.subject);
  const previewBody = getSubstitutedContent(template.body);

  // Translate 0-100 risk score to 0-100 Inbox Placement score
  // E.g. risk score 15 -> 85% inbox probability
  const inboxProbability = spamResult ? Math.max(0, 100 - spamResult.score) : null;

  const getProbabilityColor = (prob: number) => {
    if (prob >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (prob >= 60) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const getScoreProgressBarColor = (prob: number) => {
    if (prob >= 85) return 'bg-emerald-500';
    if (prob >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Editor & Preview Column */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Email Template Creator</h2>
                <p className="text-xs text-gray-500">Draft your cold email structure with custom columns placeholders.</p>
              </div>
            </div>

            {/* Editor vs Preview Mode */}
            <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'edit' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>
          </div>

          {activeTab === 'edit' ? (
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Email Subject Template
                </label>
                <input
                  type="text"
                  value={template.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="E.g. Quick question regarding {{Company | your brand}}'s marketing growth"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email Body Template
                  </label>
                  <div className="flex gap-2 text-[10px] text-gray-400 font-mono">
                    <span>Placeholders:</span>
                    <span className="text-indigo-600 font-semibold cursor-help" title="Recipient Name">{"{{Name}}"}</span>
                    <span className="text-indigo-600 font-semibold cursor-help" title="Fallback support: {{Company | default_value}}">{"{{Company | your firm}}"}</span>
                  </div>
                </div>
                <textarea
                  value={template.body}
                  onChange={(e) => updateField('body', e.target.value)}
                  placeholder={`Hi {{Name}},\n\nI noticed you are leading operations. I wanted to propose a custom strategy for {{Company | your brand}}.\n\nLet me know if you have 5 minutes this Thursday for a chat!\n\nBest,\nYashraj`}
                  rows={8}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans leading-relaxed"
                />
              </div>

              {/* AI Rewrite option */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="block text-xs font-semibold text-indigo-900">AI Hyper-Personalization</span>
                      <span className="block text-[10px] text-indigo-700">Dynamically rewrite each email to make it sound organic and maximize deliverability.</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={template.aiPersonalize}
                      onChange={(e) => updateField('aiPersonalize', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="pt-3 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">AI Engine Provider</span>
                    <span className="block text-[9px] text-indigo-700">Choose between Google Gemini or OpenAI</span>
                  </div>
                  <select
                    value={template.aiProvider || 'gemini'}
                    onChange={(e) => updateField('aiProvider', e.target.value)}
                    className="text-xs bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-indigo-900"
                  >
                    <option value="gemini">Google Gemini 3.5 (Highly Recommended)</option>
                    <option value="openai">OpenAI ChatGPT 4o-mini</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW MODE */
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center gap-2 text-xs mb-1.5 text-gray-400">
                  <span className="font-semibold text-gray-500">To:</span>
                  <span className="text-gray-800 font-mono">{firstContact ? `${firstContact.name} <${firstContact.email}>` : 'Rahul Kumar <rahul@example.com>'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-semibold text-gray-500">Subject:</span>
                  <span className="text-gray-800 font-medium">{previewSubject || '(Empty Subject)'}</span>
                </div>
              </div>
              <div className="p-5 bg-white min-h-[180px] text-sm text-gray-800 font-sans whitespace-pre-wrap leading-relaxed">
                {previewBody || 'Write your email body in the Edit tab to see a personalized preview here.'}
              </div>
              {firstContact && (
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-[10px] text-gray-500 flex items-center justify-between">
                  <span>Showing dynamic preview for recipient <b>{firstContact.name}</b></span>
                  {firstContact.extraData && Object.keys(firstContact.extraData).length > 0 && (
                    <span className="text-indigo-600 font-semibold">Loaded variables: {Object.keys(firstContact.extraData).join(', ')}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            disabled={optimizingTemplate}
            onClick={optimizeTemplateWithAI}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm shadow-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {optimizingTemplate ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Spam-Proofing Template...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Spam-Proof Template (Auto-Rewrite)
              </>
            )}
          </button>

          <button
            type="button"
            disabled={checkingSpam}
            onClick={runSpamAnalysis}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {checkingSpam ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing copy...
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                Run AI Spam Assessment
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spam Report Card Panel */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-full flex flex-col justify-between">
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              AI Inbox Placement Report
            </h3>

            {spamError && (
              <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-xs mb-4">
                {spamError}
              </div>
            )}

            {!spamResult && !checkingSpam && (
              <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center gap-2">
                <Shield className="w-8 h-8 text-gray-300" />
                <p className="text-xs font-semibold">No active assessment</p>
                <p className="text-[10px] max-w-[180px] mx-auto text-gray-400">Click the assessment button to verify your subject & body triggers before sending emails.</p>
              </div>
            )}

            {checkingSpam && (
              <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs font-medium text-indigo-600">Gemini is running deliverability checks...</p>
                <p className="text-[10px] max-w-[180px] mx-auto">Evaluating trigger words, layout mechanics, tone, and clickbait potential...</p>
              </div>
            )}

            {spamResult && inboxProbability !== null && (
              <div className="space-y-4">
                {/* Score Circle Indicator */}
                <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${getProbabilityColor(inboxProbability)}`}>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block opacity-75">Estimated Inbox rate</span>
                    <span className="text-2xl font-black block">{inboxProbability}%</span>
                    <span className="text-xs font-semibold mt-0.5 block">Status: {spamResult.status}</span>
                  </div>
                  <div>
                    {inboxProbability >= 85 ? (
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-10 h-10 text-amber-500" />
                    )}
                  </div>
                </div>

                {/* Progress Bar representation */}
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Spam Risk score: {spamResult.score}/100</span>
                    <span>Goal: &lt;15</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${getScoreProgressBarColor(inboxProbability)}`}
                      style={{ width: `${inboxProbability}%` }}
                    />
                  </div>
                </div>

                {/* Subject Critique */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                  <span className="font-semibold block text-gray-700 mb-1">Subject Line Assessment</span>
                  <p className="text-gray-600 leading-normal">{spamResult.subjectAnalysis}</p>
                </div>

                {/* Spam Trigger words */}
                <div>
                  <span className="text-xs font-semibold text-gray-700 block mb-2">Triggers &amp; Risk flags found ({spamResult.spammyTriggers.length})</span>
                  {spamResult.spammyTriggers.length === 0 ? (
                    <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-semibold inline-block">No trigger words found! Excellent copy.</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {spamResult.spammyTriggers.map((trig, idx) => (
                        <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-md border border-red-100">
                          {trig}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Inbox Optimization Rules */}
                <div>
                  <span className="text-xs font-semibold text-gray-700 block mb-1.5">Inbox Deliverability Tips</span>
                  <ul className="space-y-1.5">
                    {spamResult.suggestions.map((sug, idx) => (
                      <li key={idx} className="text-[10.5px] text-gray-600 flex items-start gap-1.5 leading-relaxed">
                        <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {spamResult && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">
              Evaluated with <b>{template.aiProvider === 'openai' ? 'OpenAI ChatGPT 4o-mini' : 'Gemini 3.5 Flash'}</b> deliverability analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
