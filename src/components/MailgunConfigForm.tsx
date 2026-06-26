import React, { useState, useEffect } from 'react';
import { MailgunConfig, OpenAIConfig, GeminiConfig, GoogleSheetsConfig, SmtpConfig } from '../types';
import { Key, Globe, Mail, User, ShieldAlert, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, Layers, Database, Shield, Server, Cpu, Sparkles } from 'lucide-react';
import { safeFetchJSON } from '../lib/apiHelper';

interface Props {
  config: MailgunConfig;
  onChange: (config: MailgunConfig) => void;
  openAIConfig: OpenAIConfig;
  onOpenAIConfigChange: (config: OpenAIConfig) => void;
  geminiConfig: GeminiConfig;
  onGeminiConfigChange: (config: GeminiConfig) => void;
  sheetsConfig: GoogleSheetsConfig;
  onSheetsConfigChange: (config: GoogleSheetsConfig) => void;
  smtpConfig: SmtpConfig;
  onSmtpConfigChange: (config: SmtpConfig) => void;
}

export default function MailgunConfigForm({
  config,
  onChange,
  openAIConfig,
  onOpenAIConfigChange,
  geminiConfig,
  onGeminiConfigChange,
  sheetsConfig,
  onSheetsConfigChange,
  smtpConfig,
  onSmtpConfigChange
}: Props) {
  const [activeTab, setActiveTab] = useState<'mailgun' | 'smtp' | 'ai' | 'sheets'>('mailgun');
  const [showMailgunKey, setShowMailgunKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);

  // Testing states
  const [testingMailgun, setTestingMailgun] = useState(false);
  const [mailgunTestResult, setMailgunTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [openaiTestResult, setOpenaiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingSheets, setTestingSheets] = useState(false);
  const [sheetsTestResult, setSheetsTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Update Mailgun fields
  const updateMailgunField = (field: keyof MailgunConfig, value: string) => {
    onChange({ ...config, [field]: value });
  };

  // Update OpenAI fields
  const updateOpenAIField = (field: keyof OpenAIConfig, value: string) => {
    onOpenAIConfigChange({ ...openAIConfig, [field]: value });
  };

  // Update Gemini fields
  const updateGeminiField = (field: keyof GeminiConfig, value: string) => {
    onGeminiConfigChange({ ...geminiConfig, [field]: value });
  };

  // Update Sheets Credentials fields
  const updateSheetsField = (field: keyof GoogleSheetsConfig, value: any) => {
    onSheetsConfigChange({ ...sheetsConfig, [field]: value });
  };

  // Update SMTP fields
  const updateSmtpField = (field: keyof SmtpConfig, value: any) => {
    onSmtpConfigChange({ ...smtpConfig, [field]: value });
  };

  // SMTP Connection Test
  const testSmtpConnection = async () => {
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.pass) {
      setSmtpTestResult({ success: false, message: "Host, Port, Username, and Password are required to test." });
      return;
    }
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const data = await safeFetchJSON('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          user: smtpConfig.user,
          pass: smtpConfig.pass
        })
      });
      if (data.success) {
        setSmtpTestResult({ success: true, message: data.message });
      } else {
        setSmtpTestResult({ success: false, message: data.error || "Connection test failed." });
      }
    } catch (e: any) {
      setSmtpTestResult({ success: false, message: e.message || "Network error." });
    } finally {
      setTestingSmtp(false);
    }
  };

  // 1. Mailgun Connection Test
  const testMailgunConnection = async () => {
    if (!config.apiKey || !config.domain) {
      setMailgunTestResult({ success: false, message: "API Key and Domain are required to test." });
      return;
    }
    setTestingMailgun(true);
    setMailgunTestResult(null);
    try {
      const data = await safeFetchJSON('/api/mailgun/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          domain: config.domain,
          region: config.region
        })
      });
      if (data.success) {
        setMailgunTestResult({ success: true, message: data.message });
      } else {
        setMailgunTestResult({ success: false, message: data.error || "Connection test failed." });
      }
    } catch (e: any) {
      setMailgunTestResult({ success: false, message: e.message || "Network error." });
    } finally {
      setTestingMailgun(false);
    }
  };

  // 2. OpenAI Connection Test
  const testOpenAIConnection = async () => {
    if (!openAIConfig.apiKey) {
      setOpenaiTestResult({ success: false, message: "API Key is required to test." });
      return;
    }
    setTestingOpenAI(true);
    setOpenaiTestResult(null);
    try {
      const data = await safeFetchJSON('/api/openai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openAIConfig.apiKey })
      });
      if (data.success) {
        setOpenaiTestResult({ success: true, message: data.message });
      } else {
        setOpenaiTestResult({ success: false, message: data.error || "Authentication failed." });
      }
    } catch (e: any) {
      setOpenaiTestResult({ success: false, message: e.message || "Network error." });
    } finally {
      setTestingOpenAI(false);
    }
  };

  // 2.2 Gemini Connection Test
  const testGeminiConnection = async () => {
    if (!geminiConfig.apiKey) {
      setGeminiTestResult({ success: false, message: "Gemini API Key is required to test." });
      return;
    }
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const data = await safeFetchJSON('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiConfig.apiKey })
      });
      if (data.success) {
        setGeminiTestResult({ success: true, message: data.message });
      } else {
        setGeminiTestResult({ success: false, message: data.error || "Authentication failed." });
      }
    } catch (e: any) {
      setGeminiTestResult({ success: false, message: e.message || "Network error." });
    } finally {
      setTestingGemini(false);
    }
  };

  // 3. Google Sheets Connection Test
  const testSheetsConnection = async () => {
    if (!sheetsConfig.accessToken) {
      setSheetsTestResult({ success: false, message: "Please connect your Google Account first." });
      return;
    }
    setTestingSheets(true);
    setSheetsTestResult(null);
    try {
      const data = await safeFetchJSON('/api/google/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: sheetsConfig.clientId,
          clientSecret: sheetsConfig.clientSecret,
          accessToken: sheetsConfig.accessToken,
          refreshToken: sheetsConfig.refreshToken,
          expiryDate: sheetsConfig.tokenExpiry
        })
      });
      if (data.success) {
        setSheetsTestResult({ success: true, message: `Connected! Account: ${data.email}` });
        if (data.email && data.email !== sheetsConfig.connectedEmail) {
          updateSheetsField('connectedEmail', data.email);
        }
      } else {
        setSheetsTestResult({ success: false, message: data.error || "Token is invalid or expired." });
      }
    } catch (e: any) {
      setSheetsTestResult({ success: false, message: e.message || "Network error." });
    } finally {
      setTestingSheets(false);
    }
  };

  // 4. Initiate Google Sheets OAuth Flow
  const startGoogleOAuth = async () => {
    if (!sheetsConfig.clientId || !sheetsConfig.clientSecret) {
      alert("Please enter both Google Client ID and Google Client Secret (from your Google Cloud Console, like in n8n).");
      return;
    }

    try {
      const params = new URLSearchParams({
        clientId: sheetsConfig.clientId,
        clientSecret: sheetsConfig.clientSecret,
        origin: window.location.origin
      });

      const data = await safeFetchJSON(`/api/auth/google/url?${params.toString()}`);
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup) {
        alert("Popup blocked! Please allow popups for this site to complete authorization.");
      }
    } catch (e: any) {
      alert(`OAuth initialization error: ${e.message}`);
    }
  };

  // Set up popup postMessage handler
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { accessToken, refreshToken, expiryDate, clientId, clientSecret, connectedEmail } = event.data.tokens;
        onSheetsConfigChange({
          clientId,
          clientSecret,
          accessToken,
          refreshToken,
          tokenExpiry: expiryDate,
          isConnected: true,
          connectedEmail
        });
        setSheetsTestResult({ success: true, message: `Successfully authenticated! Connected as ${connectedEmail}` });
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [sheetsConfig, onSheetsConfigChange]);

  const disconnectGoogle = () => {
    if (window.confirm("Are you sure you want to disconnect your Google Account?")) {
      onSheetsConfigChange({
        clientId: sheetsConfig.clientId,
        clientSecret: sheetsConfig.clientSecret,
        isConnected: false,
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiry: undefined,
        connectedEmail: undefined
      });
      setSheetsTestResult(null);
    }
  };

  const currentRedirectUri = `${window.location.origin}/api/auth/google/callback`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Unified Credentials & Connections Tab System */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-indigo-600" />
            <span className="font-bold text-sm tracking-tight text-gray-900">Connections &amp; API Keys</span>
          </div>
          <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200 gap-0.5 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('mailgun')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'mailgun' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Mailgun
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('smtp')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'smtp' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              SMTP
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'ai' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Gemini &amp; OpenAI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sheets')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'sheets' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              GSheets
            </button>
          </div>
        </div>

        {/* 1. MAILGUN PANEL */}
        {activeTab === 'mailgun' && (
          <div className="space-y-4 animate-fade-in">
            {/* Private Key */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Mailgun Private API Key
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <Key className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showMailgunKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => updateMailgunField('apiKey', e.target.value)}
                  placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowMailgunKey(!showMailgunKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showMailgunKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Domain & Region */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Mailgun Domain
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <Globe className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={config.domain}
                    onChange={(e) => updateMailgunField('domain', e.target.value)}
                    placeholder="onlineclasshelp.us"
                    className="w-full pl-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Region
                </label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateMailgunField('region', 'us')}
                    className={`py-1 text-[10px] font-semibold rounded-md transition-all ${
                      config.region === 'us' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    US
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMailgunField('region', 'eu')}
                    className={`py-1 text-[10px] font-semibold rounded-md transition-all ${
                      config.region === 'eu' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    EU
                  </button>
                </div>
              </div>
            </div>

            {/* Sender From details */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  From Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={config.fromName}
                    onChange={(e) => updateMailgunField('fromName', e.target.value)}
                    placeholder="Info"
                    className="w-full pl-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  From Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => updateMailgunField('fromEmail', e.target.value)}
                    placeholder="info@onlineclasshelp.us"
                    className="w-full pl-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Mailgun Test connection display banner */}
            {mailgunTestResult && (
              <div className={`p-2.5 rounded-xl border text-[11px] flex gap-2 items-start ${
                mailgunTestResult.success ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'
              }`}>
                {mailgunTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />}
                <p>{mailgunTestResult.message}</p>
              </div>
            )}

            <button
              type="button"
              disabled={testingMailgun}
              onClick={testMailgunConnection}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 mt-1"
            >
              {testingMailgun ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              Test Mailgun Connection
            </button>
          </div>
        )}

        {/* 2. SMTP PANEL */}
        {activeTab === 'smtp' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs tracking-tight text-gray-900">Fallback SMTP Server</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={smtpConfig.enabled}
                  onChange={(e) => updateSmtpField('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <p className="text-[10px] text-gray-400 leading-normal">
              If Mailgun fails to deliver (due to credentials, domain, or temporary issues), we'll automatically route the email through this SMTP server.
            </p>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpConfig.host || ''}
                    onChange={(e) => updateSmtpField('host', e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={smtpConfig.port || ''}
                    onChange={(e) => updateSmtpField('port', e.target.value)}
                    placeholder="587"
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtp-secure-tab"
                  checked={smtpConfig.secure}
                  onChange={(e) => updateSmtpField('secure', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                />
                <label htmlFor="smtp-secure-tab" className="text-[10px] font-semibold text-gray-600">
                  SSL/TLS Connection (Secure Port 465)
                </label>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={smtpConfig.user || ''}
                  onChange={(e) => updateSmtpField('user', e.target.value)}
                  placeholder="info@onlineclasshelp.us"
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  SMTP Password
                </label>
                <div className="relative">
                  <input
                    type={showSmtpPassword ? 'text' : 'password'}
                    value={smtpConfig.pass || ''}
                    onChange={(e) => updateSmtpField('pass', e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-2 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showSmtpPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {smtpTestResult && (
                <div className={`p-2 rounded border text-[10px] flex gap-1.5 items-start ${
                  smtpTestResult.success ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'
                }`}>
                  {smtpTestResult.success ? <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />}
                  <p>{smtpTestResult.message}</p>
                </div>
              )}

              <button
                type="button"
                disabled={testingSmtp}
                onClick={testSmtpConnection}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {testingSmtp ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                Test SMTP Fallback Connection
              </button>
            </div>
          </div>
        )}

        {/* 3. GEMINI & OPENAI PANEL */}
        {activeTab === 'ai' && (
          <div className="space-y-4 animate-fade-in">
            {/* Gemini Section */}
            <div className="space-y-3 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-gray-900">Gemini AI (Recommended)</span>
              </div>
              
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 pointer-events-none">
                    <Key className="w-3 h-3" />
                  </span>
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiConfig.apiKey || ''}
                    onChange={(e) => updateGeminiField('apiKey', e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showGeminiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Gemini Engine Model
                </label>
                <select
                  value={geminiConfig.model || 'gemini-2.5-flash'}
                  onChange={(e) => updateGeminiField('model', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Fast &amp; cost-efficient - Recommended)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Creative &amp; precise personalization)</option>
                </select>
              </div>

              {geminiTestResult && (
                <div className={`p-2 rounded border text-[10px] flex gap-1.5 items-start ${
                  geminiTestResult.success ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'
                }`}>
                  {geminiTestResult.success ? <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />}
                  <p>{geminiTestResult.message}</p>
                </div>
              )}

              <button
                type="button"
                disabled={testingGemini}
                onClick={testGeminiConnection}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-50"
              >
                {testingGemini ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Key className="w-3 h-3" />}
                Test Gemini Connection
              </button>
            </div>

            {/* OpenAI Section */}
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-xs text-gray-900">OpenAI (ChatGPT)</span>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  OpenAI Secret API Key
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 pointer-events-none">
                    <Key className="w-3 h-3" />
                  </span>
                  <input
                    type={showOpenAIKey ? 'text' : 'password'}
                    value={openAIConfig.apiKey || ''}
                    onChange={(e) => updateOpenAIField('apiKey', e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showOpenAIKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  ChatGPT Engine Model
                </label>
                <select
                  value={openAIConfig.model || 'gpt-4o-mini'}
                  onChange={(e) => updateOpenAIField('model', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Fast &amp; cost-efficient)</option>
                  <option value="gpt-4o">gpt-4o (Most creative &amp; precise)</option>
                </select>
              </div>

              {openaiTestResult && (
                <div className={`p-2 rounded border text-[10px] flex gap-1.5 items-start ${
                  openaiTestResult.success ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'
                }`}>
                  {openaiTestResult.success ? <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />}
                  <p>{openaiTestResult.message}</p>
                </div>
              )}

              <button
                type="button"
                disabled={testingOpenAI}
                onClick={testOpenAIConnection}
                className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-50"
              >
                {testingOpenAI ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Key className="w-3 h-3" />}
                Test OpenAI Connection
              </button>
            </div>
          </div>
        )}

        {/* 3. GOOGLE SHEETS OAUTH PANEL */}
        {activeTab === 'sheets' && (
          <div className="space-y-4 animate-fade-in">
            {/* Connection Status Indicator */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              sheetsConfig.isConnected ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'
            }`}>
              <div>
                <span className="block font-bold text-[10px] uppercase opacity-75">OAuth Status</span>
                <span className="block font-semibold">
                  {sheetsConfig.isConnected ? `Connected with ${sheetsConfig.connectedEmail || 'Google Account'}` : 'Google Account Disconnected'}
                </span>
              </div>
              <div className="shrink-0">
                {sheetsConfig.isConnected ? (
                  <button
                    type="button"
                    onClick={disconnectGoogle}
                    className="px-2.5 py-1 bg-white hover:bg-red-50 hover:text-red-600 text-emerald-700 border border-emerald-200 hover:border-red-200 text-[10px] font-bold rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse block" />
                )}
              </div>
            </div>

            {/* Setup Client Credentials */}
            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>Google OAuth App Credentials</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Input your credentials below to link sheets securely, similar to n8n.
              </p>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  OAuth Client ID
                </label>
                <input
                  type="text"
                  value={sheetsConfig.clientId}
                  onChange={(e) => updateSheetsField('clientId', e.target.value)}
                  placeholder="xxxxxxxx.apps.googleusercontent.com"
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  OAuth Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showGoogleSecret ? 'text' : 'password'}
                    value={sheetsConfig.clientSecret}
                    onChange={(e) => updateSheetsField('clientSecret', e.target.value)}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-2 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showGoogleSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Redirect URI copy helper */}
              <div>
                <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Authorized Redirect URI (for Google Console)
                </span>
                <div className="bg-slate-100 p-1.5 rounded-md text-[10px] font-mono text-slate-600 break-all select-all select-none border border-slate-200">
                  {currentRedirectUri}
                </div>
              </div>
            </div>

            {/* Sheets Test Connection Result */}
            {sheetsTestResult && (
              <div className={`p-2.5 rounded-xl border text-[11px] flex gap-2 items-start ${
                sheetsTestResult.success ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'
              }`}>
                {sheetsTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />}
                <p>{sheetsTestResult.message}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={startGoogleOAuth}
                className="py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                Connect Google Account
              </button>

              <button
                type="button"
                disabled={testingSheets || !sheetsConfig.isConnected}
                onClick={testSheetsConnection}
                className="py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {testingSheets ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                Test Connection
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 text-center">
        Created by <b>Digilaxy</b>. Secured client-side storage.
      </div>
    </div>
  );
}
