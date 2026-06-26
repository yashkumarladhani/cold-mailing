import React, { useState, useEffect, useRef } from 'react';
import { Contact, MailgunConfig, EmailTemplate, CampaignStats, GoogleSheetsConfig, OpenAIConfig, SmtpConfig, GeminiConfig } from './types';
import MailgunConfigForm from './components/MailgunConfigForm';
import CsvImporter from './components/CsvImporter';
import TemplateEditor from './components/TemplateEditor';
import CampaignProgress from './components/CampaignProgress';
import ContactsTable from './components/ContactsTable';
import { Send, Sparkles, Mail, CheckCircle2, Play, Pause, Trash2, ArrowRight, BookOpen, Clock, PlayCircle, Shield, Key, Globe, LayoutDashboard, History, Lock, UserCheck, LogOut, Database, Eye, EyeOff, Menu, X } from 'lucide-react';
import { safeFetchJSON } from './lib/apiHelper';

export default function App() {
  // Login Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('coldmail_is_logged_in') === 'true';
    } catch {
      return false;
    }
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Load initial configs from LocalStorage
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('coldmail_contacts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [config, setConfig] = useState<MailgunConfig>(() => {
    try {
      const saved = localStorage.getItem('coldmail_config');
      return saved ? JSON.parse(saved) : {
        apiKey: '',
        domain: '',
        region: 'us',
        fromName: '',
        fromEmail: ''
      };
    } catch {
      return {
        apiKey: '',
        domain: '',
        region: 'us',
        fromName: '',
        fromEmail: ''
      };
    }
  });

  const [openAIConfig, setOpenAIConfig] = useState<OpenAIConfig>(() => {
    try {
      const saved = localStorage.getItem('coldmail_openai_config');
      return saved ? JSON.parse(saved) : {
        apiKey: '',
        model: 'gpt-4o-mini'
      };
    } catch {
      return {
        apiKey: '',
        model: 'gpt-4o-mini'
      };
    }
  });

  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>(() => {
    try {
      const saved = localStorage.getItem('coldmail_gemini_config');
      return saved ? JSON.parse(saved) : {
        apiKey: '',
        model: 'gemini-2.5-flash'
      };
    } catch {
      return {
        apiKey: '',
        model: 'gemini-2.5-flash'
      };
    }
  });

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    try {
      const saved = localStorage.getItem('coldmail_smtp_config');
      return saved ? JSON.parse(saved) : {
        enabled: false,
        host: '',
        port: '587',
        secure: false,
        user: '',
        pass: ''
      };
    } catch {
      return {
        enabled: false,
        host: '',
        port: '587',
        secure: false,
        user: '',
        pass: ''
      };
    }
  });

  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem('coldmail_sheets_config');
      return saved ? JSON.parse(saved) : {
        clientId: '',
        clientSecret: '',
        isConnected: false
      };
    } catch {
      return {
        clientId: '',
        clientSecret: '',
        isConnected: false
      };
    }
  });

  const [template, setTemplate] = useState<EmailTemplate>(() => {
    try {
      const saved = localStorage.getItem('coldmail_template');
      return saved ? JSON.parse(saved) : {
        subject: 'Quick query regarding {{Company | your business}}\'s scale operations',
        body: 'Hi {{Name}},\n\nI noticed you are managing growth at {{Company | your firm}}.\n\nWe recently created a custom outbound solution that automates personalized email delivery straight to the primary inbox with zero spam risk.\n\nAre you free for a quick 5-minute call this Thursday at 3 PM to see if we can boost your reply rate?\n\nBest regards,\nYashraj',
        aiPersonalize: false,
        aiProvider: 'gemini'
      };
    } catch {
      return {
        subject: '',
        body: '',
        aiPersonalize: false,
        aiProvider: 'gemini'
      };
    }
  });

  // Campaign running state managers
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(0); // seconds left (0 to 15)
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Migrate/reset default mock values from localStorage if they exist to reflect 'Setup Required' initially
  useEffect(() => {
    try {
      const saved = localStorage.getItem('coldmail_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if ((parsed.apiKey && parsed.apiKey.includes('2f0794f')) || parsed.domain === 'onlineclasshelp.us') {
          const resetConfig = {
            apiKey: '',
            domain: '',
            region: 'us',
            fromName: '',
            fromEmail: ''
          };
          setConfig(resetConfig);
          localStorage.setItem('coldmail_config', JSON.stringify(resetConfig));
        }
      }
    } catch (e) {
      console.error("Migration error:", e);
    }
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('coldmail_is_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('coldmail_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('coldmail_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('coldmail_openai_config', JSON.stringify(openAIConfig));
  }, [openAIConfig]);

  useEffect(() => {
    localStorage.setItem('coldmail_gemini_config', JSON.stringify(geminiConfig));
  }, [geminiConfig]);

  useEffect(() => {
    localStorage.setItem('coldmail_smtp_config', JSON.stringify(smtpConfig));
  }, [smtpConfig]);

  useEffect(() => {
    localStorage.setItem('coldmail_sheets_config', JSON.stringify(sheetsConfig));
  }, [sheetsConfig]);

  useEffect(() => {
    localStorage.setItem('coldmail_template', JSON.stringify(template));
  }, [template]);

  // Clean up loops on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (loginUsername === 'digilaxy' && loginPassword === 'Digilaxy@123') {
      setIsLoggedIn(true);
      addLog("User digilaxy logged in successfully.");
    } else {
      setLoginError("Invalid username or password. Please try again.");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      setIsLoggedIn(false);
      setLoginUsername('');
      setLoginPassword('');
    }
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSystemLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // Skip validation or address missing handling
  const skipContact = (index: number, reason: string) => {
    setContacts(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          status: 'Skipped',
          errorMessage: reason
        };
      }
      return updated;
    });
    addLog(`Bypassed recipient #${index + 1}: ${reason}`);
  };

  // Perform client-side placeholder backup substitution
  const substituteLocalVariables = (text: string, contact: Contact) => {
    let result = text;
    const replacementMap: Record<string, string> = {
      name: contact.name,
      email: contact.email,
    };
    if (contact.extraData) {
      Object.entries(contact.extraData).forEach(([key, val]) => {
        replacementMap[key.toLowerCase()] = val;
      });
    }

    result = result.replace(/\{\{\s*([^}|]+?)(?:\s*\|\s*([^}]+?))?\s*\}\}/g, (match, key, defaultValue) => {
      const cleanKey = key.trim().toLowerCase();
      if (replacementMap[cleanKey] !== undefined) {
        return replacementMap[cleanKey];
      }
      return defaultValue ? defaultValue.trim() : match;
    });

    return result;
  };

  // Campaign looping engine
  useEffect(() => {
    if (!isRunning) return;

    // Find the next contact that needs processing
    const nextPendingIdx = contacts.findIndex((c, idx) => idx >= currentIndex && c.status === 'Pending');

    if (nextPendingIdx === -1) {
      // Completed entire list!
      setIsRunning(false);
      addLog("Campaign Complete! All contacts processed successfully.");
      return;
    }

    // Jump index to next pending if needed
    if (nextPendingIdx !== currentIndex) {
      setCurrentIndex(nextPendingIdx);
      return;
    }

    const currentContact = contacts[currentIndex];

    // Safety check: skip if email is blank or doesn't have an @ symbol ("jis mail ka mail addres found nahi ho rhaah us ko chor edoo")
    if (!currentContact.email || !currentContact.email.trim() || !currentContact.email.includes('@')) {
      skipContact(currentIndex, `Email address not found or invalid for recipient: "${currentContact.name || 'Unknown'}"`);
      setCurrentIndex(prev => prev + 1);
      return;
    }

    const processAndSendEmail = async () => {
      try {
        // Set state to sending
        setContacts(prev => {
          const updated = [...prev];
          updated[currentIndex] = { ...updated[currentIndex], status: 'Sending' };
          return updated;
        });

        addLog(`Preparing outbound email for: ${currentContact.name} (${currentContact.email})`);

        let finalSubject = substituteLocalVariables(template.subject, currentContact);
        let finalBody = substituteLocalVariables(template.body, currentContact);
        let calculatedSpamScore = undefined;
        let calculatedSpamStatus = undefined;

        // Perform AI Personalization rewrite if enabled
        const activeProvider = template.aiProvider || 'gemini';
        if (template.aiPersonalize) {
          addLog(`Calling ${activeProvider === 'gemini' ? 'Gemini AI' : 'OpenAI (ChatGPT)'} to personalize template details for ${currentContact.name}...`);
          try {
            const endpoint = activeProvider === 'gemini' ? '/api/gemini/personalize' : '/api/openai/personalize';
            const personalizedData = await safeFetchJSON(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subjectTemplate: template.subject,
                bodyTemplate: template.body,
                recipient: {
                  name: currentContact.name,
                  email: currentContact.email,
                  ...(currentContact.extraData || {})
                },
                apiKey: activeProvider === 'gemini' ? geminiConfig.apiKey : openAIConfig.apiKey
              })
            });

            finalSubject = personalizedData.subject;
            finalBody = personalizedData.body;
            addLog(`AI Personalization crafted. E.g. Subject: "${finalSubject}"`);
          } catch (e: any) {
            console.error(e);
            addLog(`AI Personalization failed: ${e.message}. Falling back to simple tag replacement.`);
          }
        }

        // Run deliverability check on final subject and body to determine Inbox vs Spam Folder placement
        let placementResult: 'Inbox' | 'Spam Folder' | 'Unknown' = 'Inbox';
        try {
          addLog(`Analyzing deliverability of personalized copy via ${activeProvider === 'gemini' ? 'Gemini' : 'OpenAI'}...`);
          const spamCheckEndpoint = activeProvider === 'gemini' ? '/api/gemini/spam-check' : '/api/openai/spam-check';
          const spamCheckData = await safeFetchJSON(spamCheckEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: finalSubject,
              body: finalBody,
              apiKey: activeProvider === 'gemini' ? geminiConfig.apiKey : openAIConfig.apiKey
            })
          });

          calculatedSpamScore = spamCheckData.score;
          calculatedSpamStatus = spamCheckData.status;
          // Classify placement: if score > 35, it's flagged as high/moderate spam risk
          if (spamCheckData.score > 35) {
            placementResult = 'Spam Folder';
          } else {
            placementResult = 'Inbox';
          }
          addLog(`Deliverability report: Risk Score ${calculatedSpamScore}% (${calculatedSpamStatus}). Folder Placement: ${placementResult}.`);
        } catch (e) {
          console.error("In-flight deliverability analysis failed:", e);
        }

        // Send via server proxy Mailgun API with SMTP fallback config
        addLog(`Delivering email via Mailgun SMTP proxy...`);
        const sendData = await safeFetchJSON('/api/mailgun/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: config.apiKey,
            domain: config.domain,
            region: config.region,
            fromName: config.fromName,
            fromEmail: config.fromEmail,
            to: currentContact.email,
            subject: finalSubject,
            body: finalBody,
            smtpConfig: smtpConfig
          })
        });

        if (sendData.success) {
          const viaFallback = sendData.usedFallback ? " (via Fallback SMTP)" : "";
          addLog(`SUCCESS: Mail delivered to ${currentContact.email}${viaFallback}. Message ID: ${sendData.messageId}`);
          setContacts(prev => {
            const updated = [...prev];
            updated[currentIndex] = {
              ...updated[currentIndex],
              status: 'Sent',
              messageId: sendData.messageId,
              sentAt: new Date().toLocaleTimeString(),
              spamRiskScore: calculatedSpamScore,
              spamRiskStatus: calculatedSpamStatus,
              placement: placementResult
            };
            return updated;
          });
        } else {
          const errMsg = sendData.error || "Mailgun API response failure.";
          addLog(`FAILURE sending to ${currentContact.email}: ${errMsg}`);
          setContacts(prev => {
            const updated = [...prev];
            updated[currentIndex] = {
              ...updated[currentIndex],
              status: 'Failed',
              errorMessage: errMsg
            };
            return updated;
          });
        }

      } catch (err: any) {
        addLog(`Network Error sending to ${currentContact.email}: ${err.message}`);
        setContacts(prev => {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            status: 'Failed',
            errorMessage: err.message
          };
          return updated;
        });
      }

      // Check if there are any pending contacts remaining in the campaign list
      const hasMorePending = contacts.slice(currentIndex + 1).some(c => c.status === 'Pending');

      if (hasMorePending) {
        // Start 15-second timer delay before next email to protect reputation and avoid spam filters
        addLog("Enforcing 15-second spacing rule. Keeping SMTP socket safe...");
        setCountdown(15);
        
        countdownTimerRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              // Trigger loop to process next contact
              setCurrentIndex(prevIndex => prevIndex + 1);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // No more pending contacts left
        addLog("Finished processing all items. Campaign stopped.");
        setIsRunning(false);
      }
    };

    processAndSendEmail();

  }, [isRunning, currentIndex]);

  // Handle manual/test sending to verify SMTP integrity
  const sendTestEmail = async () => {
    if (!config.apiKey || !config.domain || !config.fromEmail) {
      alert("Please fill in Mailgun SMTP settings in Step 1 first.");
      return;
    }

    const testTarget = prompt("Enter the email address where we should send the test cold email:", config.fromEmail);
    if (!testTarget || !testTarget.trim()) return;

    addLog(`Initiating test outbound send to ${testTarget}...`);
    try {
      const data = await safeFetchJSON('/api/mailgun/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          domain: config.domain,
          region: config.region,
          fromName: config.fromName,
          fromEmail: config.fromEmail,
          to: testTarget,
          subject: `[Test Outbound Mode] ${template.subject.replace(/\{\{Name\}\}/g, 'Tester')}`,
          body: `This is a test message to verify your Mailgun API configurations.\n\n---\n\n${template.body.replace(/\{\{Name\}\}/g, 'Tester')}`
        })
      });

      if (data.success) {
        alert(`Test Email sent successfully!\nMessage ID: ${data.messageId}`);
        addLog(`Test email dispatched successfully to ${testTarget}.`);
      } else {
        alert(`Mailgun error: ${data.error || "Unknown error occurred"}`);
        addLog(`Test outbound sending failed: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Outbound error: ${e.message}`);
    }
  };

  // Import Callback
  const handleImport = (newContacts: Contact[]) => {
    setContacts(newContacts);
    setCurrentIndex(0);
    setIsRunning(false);
    setCountdown(0);
    addLog(`Imported ${newContacts.length} recipient rows from sheet (replaced previous data).`);
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your loaded contact list? This deletes logs and statuses.")) {
      setContacts([]);
      setCurrentIndex(0);
      setIsRunning(false);
      setCountdown(0);
      addLog("Cleared recipient database sheet.");
    }
  };

  const handleRemoveContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleResetCampaign = () => {
    if (window.confirm("Reset status of all contacts back to 'Pending' so you can re-run the campaign?")) {
      setContacts(prev => prev.map(c => ({
        ...c,
        status: 'Pending',
        errorMessage: undefined,
        messageId: undefined,
        sentAt: undefined
      })));
      setCurrentIndex(0);
      setIsRunning(false);
      setCountdown(0);
      addLog("Reset all recipient statuses to Pending.");
    }
  };

  // Calculate campaign metrics
  const stats: CampaignStats = {
    total: contacts.length,
    sent: contacts.filter(c => c.status === 'Sent' && c.placement !== 'Spam Folder').length,
    failed: contacts.filter(c => c.status === 'Failed').length,
    skipped: contacts.filter(c => c.status === 'Skipped').length,
    pending: contacts.filter(c => c.status === 'Pending').length,
    avgSpamRisk: contacts.filter(c => c.spamRiskScore !== undefined).length > 0
      ? Math.round(contacts.reduce((acc, c) => acc + (c.spamRiskScore || 0), 0) / contacts.filter(c => c.spamRiskScore !== undefined).length)
      : 0,
    spamCount: contacts.filter(c => c.status === 'Sent' && c.placement === 'Spam Folder').length
  };

  const hasConfiguredMailgun = config.apiKey.trim() !== '' && config.domain.trim() !== '';

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 font-sans text-slate-800 p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 p-8 shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-100">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-4">Digilaxy Cold Outreach</h1>
              <p className="text-xs text-slate-400 mt-1">Enterprise automated mail deliverability console.</p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 text-xs font-semibold text-center">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Console Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="digilaxy"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Security Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-200 transition-all cursor-pointer"
              >
                ACCESS CONSOLE
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
            Secured and compiled under Digilaxy outreach protocols.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      
      {/* Mobile Sidebar backdrop */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Sidebar Navigation (Responsive: hidden off-screen on mobile unless open) */}
      <aside className={`w-64 bg-white border-r border-slate-200 fixed lg:static inset-y-0 left-0 z-50 lg:flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${
        showMobileMenu ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-md tracking-tight text-slate-900 font-display">MailFlow AI</span>
              <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">Cold Mail Automator</span>
            </div>
          </div>
          <button 
            onClick={() => setShowMobileMenu(false)}
            className="p-1 text-slate-400 hover:text-slate-600 lg:hidden rounded-lg hover:bg-slate-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <a href="#campaign-progress" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-lg font-medium text-xs">
            <LayoutDashboard className="w-4 h-4" />
            <span>Campaign Dashboard</span>
          </a>
          <a href="#mailgun-setup" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 text-slate-500 px-4 py-2.5 hover:bg-slate-100 rounded-lg transition-colors text-xs">
            <Key className="w-4 h-4" />
            <span>Settings &amp; APIs</span>
          </a>
          <a href="#recipients-table" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 text-slate-500 px-4 py-2.5 hover:bg-slate-100 rounded-lg transition-colors text-xs">
            <Globe className="w-4 h-4" />
            <span>Outreach Directory</span>
          </a>
          <a href="#template-editor" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 text-slate-500 px-4 py-2.5 hover:bg-slate-100 rounded-lg transition-colors text-xs">
            <BookOpen className="w-4 h-4" />
            <span>Template Creator</span>
          </a>
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 font-mono tracking-wider">Mailgun Status</p>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${hasConfiguredMailgun ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></div>
              <span className="text-xs font-semibold">{hasConfiguredMailgun ? 'API Connected' : 'Setup Required'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-xl text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout (digilaxy)
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header / Status Bar */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Active Campaign Loop</h2>
              <p className="text-sm sm:text-md lg:text-lg font-bold text-slate-900 tracking-tight">
                {isRunning ? '🟢 Running Automation' : stats.pending > 0 && stats.sent > 0 ? '🟡 Paused Outbound' : '⚫ Campaign Idle'}
              </p>
            </div>
            
            {isRunning && countdown > 0 && (
              <>
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                <div className="hidden sm:flex items-center space-x-3 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700">
                  <span className="font-mono">NEXT IN: 15s delay (t-{countdown}s)</span>
                  <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(countdown / 15) * 100}%` }}></div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-3">
            {isRunning ? (
              <button 
                onClick={() => {
                  setIsRunning(false);
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  addLog("Campaign paused by user.");
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg border border-red-100 transition-colors cursor-pointer"
              >
                PAUSE LOOP
              </button>
            ) : (
              <button 
                onClick={() => {
                  if (currentIndex >= contacts.length) {
                    setCurrentIndex(0);
                  }
                  setIsRunning(true);
                  addLog("Outbound loop started. Accessing pending queue items...");
                }}
                disabled={!contacts.length || !hasConfiguredMailgun}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-lg shadow-blue-200 transition-all cursor-pointer"
              >
                RESUME AUTOMATION
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Content Workspace Grid */}
        <div className="flex-1 p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 overflow-y-auto min-h-0">
          
          {/* Left: Interactive elements (col-span-8) */}
          <div className="xl:col-span-8 space-y-8 min-h-0">
            
            {/* Step-by-Step Overview Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 font-display">1</div>
                <div>
                  <span className="block text-xs font-semibold text-slate-800">SMTP Integration</span>
                  <span className="block text-[10px] text-slate-400">Configure Mailgun API</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border-t md:border-t-0 md:border-l border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 font-display">2</div>
                <div>
                  <span className="block text-xs font-semibold text-slate-800">Google Sheets Data</span>
                  <span className="block text-[10px] text-slate-400">Paste or load list</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border-t md:border-t-0 md:border-l border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0 font-display">3</div>
                <div>
                  <span className="block text-xs font-semibold text-slate-800">Verify Spam Rating</span>
                  <span className="block text-[10px] text-slate-400">AI Placement checks</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border-t md:border-t-0 md:border-l border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0 font-display">4</div>
                <div>
                  <span className="block text-xs font-semibold text-slate-800">Loop Automation</span>
                  <span className="block text-[10px] text-slate-400">15s delay delivery cycle</span>
                </div>
              </div>
            </div>

            {/* Template Composer & AI Spam report */}
            <section id="template-editor" className="scroll-mt-24">
              <TemplateEditor
                template={template}
                onChange={setTemplate}
                firstContact={contacts[0]}
                openAIConfig={openAIConfig}
                geminiConfig={geminiConfig}
              />
            </section>

            {/* Active Outreach Directory */}
            <section id="recipients-table" className="scroll-mt-24 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-display">Active Outreach Directory</h2>
                  <p className="text-xs text-slate-500">Real-time status tracking logs, delivery timestamps, and filter groups.</p>
                </div>
              </div>
              <ContactsTable
                contacts={contacts}
                onClearAll={handleClearAll}
                onRemoveContact={handleRemoveContact}
              />
            </section>
          </div>

          {/* Right: Engine metrics, settings, and logs (col-span-4) */}
          <div className="xl:col-span-4 space-y-6 lg:space-y-8 min-h-0">
            
            {/* Automation controller stats gauge */}
            <section id="campaign-progress" className="scroll-mt-24">
              <CampaignProgress
                stats={stats}
                isRunning={isRunning}
                onStart={() => {
                  if (currentIndex >= contacts.length) {
                    setCurrentIndex(0);
                  }
                  setIsRunning(true);
                  addLog("Outbound loop started. Accessing pending queue items...");
                }}
                onPause={() => {
                  setIsRunning(false);
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  addLog("Campaign paused by user.");
                }}
                onReset={handleResetCampaign}
                onSendTest={sendTestEmail}
                countdown={countdown}
                currentRecipientEmail={contacts[currentIndex]?.email}
                hasContacts={contacts.length > 0}
                hasConfig={hasConfiguredMailgun}
              />
            </section>

            {/* Unified Settings & API Configurations */}
            <section id="mailgun-setup" className="scroll-mt-24">
              <MailgunConfigForm
                config={config}
                onChange={setConfig}
                openAIConfig={openAIConfig}
                onOpenAIConfigChange={setOpenAIConfig}
                geminiConfig={geminiConfig}
                onGeminiConfigChange={setGeminiConfig}
                sheetsConfig={sheetsConfig}
                onSheetsConfigChange={setSheetsConfig}
                smtpConfig={smtpConfig}
                onSmtpConfigChange={setSmtpConfig}
              />
            </section>

            {/* Sheets Importer */}
            <section id="contacts-import" className="scroll-mt-24">
              <CsvImporter
                onImport={handleImport}
                currentCount={contacts.length}
                sheetsConfig={sheetsConfig}
                onSheetsConfigChange={setSheetsConfig}
              />
            </section>

            {/* Live activity log terminal */}
            <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Outbound Transaction Logs</h3>
                </div>
                <button
                  onClick={() => setSystemLogs([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono underline cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-300 h-44 overflow-y-auto bg-slate-950/50 rounded-xl p-3 border border-slate-800 space-y-1 scrollbar-thin">
                {systemLogs.length === 0 ? (
                  <span className="text-slate-600 italic">No transactions loaded yet. Import spreadsheet data or start loops to watch real-time SMTP handshakes.</span>
                ) : (
                  systemLogs.map((log, idx) => {
                    let textClass = 'text-slate-400';
                    if (log.includes('SUCCESS')) textClass = 'text-green-400';
                    else if (log.includes('FAILURE') || log.includes('Error')) textClass = 'text-red-400';
                    else if (log.includes('AI Personalization')) textClass = 'text-blue-300';
                    else if (log.includes('Wait 15s') || log.includes('spacing rule')) textClass = 'text-amber-400';
                    return (
                      <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${textClass}`}>
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}

