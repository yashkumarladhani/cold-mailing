import React, { useState, useRef, useEffect } from 'react';
import { Contact, GoogleSheetsConfig } from '../types';
import { Upload, Clipboard, Link, FileSpreadsheet, Trash2, ArrowRight, Sparkles, AlertCircle, RefreshCw, Database, CheckCircle2 } from 'lucide-react';
import { safeFetchJSON } from '../lib/apiHelper';

interface Props {
  onImport: (contacts: Contact[]) => void;
  currentCount: number;
  sheetsConfig: GoogleSheetsConfig;
  onSheetsConfigChange: (config: GoogleSheetsConfig) => void;
}

export default function CsvImporter({ onImport, currentCount, sheetsConfig, onSheetsConfigChange }: Props) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'url' | 'drive'>('paste');
  const [pasteData, setPasteData] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheets Drive Integration states
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState('');
  const [sheetTabs, setSheetTabs] = useState<Array<{ title: string }>>([]);
  const [selectedTab, setSelectedTab] = useState('');
  const [fetchingGSheets, setFetchingGSheets] = useState(false);

  // Automatically fetch spreadsheets when GSheets Drive tab is selected
  useEffect(() => {
    if (activeTab === 'drive' && sheetsConfig.isConnected) {
      loadSpreadsheets();
    }
  }, [activeTab, sheetsConfig.isConnected]);

  // Load list of Google Spreadsheets
  const loadSpreadsheets = async () => {
    setFetchingGSheets(true);
    setError(null);
    try {
      const data = await safeFetchJSON('/api/google/spreadsheets', {
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

      // If token was refreshed on backend, update state
      if (data.tokenUpdate) {
        onSheetsConfigChange({
          ...sheetsConfig,
          accessToken: data.tokenUpdate.accessToken,
          refreshToken: data.tokenUpdate.refreshToken,
          tokenExpiry: data.tokenUpdate.expiryDate
        });
      }

      setSpreadsheets(data.files || []);
      if (data.files?.length > 0) {
        setSelectedSpreadsheet(data.files[0].id);
        loadSheetTabs(data.files[0].id);
      }
    } catch (e: any) {
      setError(e.message || "Failed to query Google Drive spreadsheets.");
    } finally {
      setFetchingGSheets(false);
    }
  };

  // Load tabs/sheets inside selected spreadsheet
  const loadSheetTabs = async (spreadsheetId: string) => {
    if (!spreadsheetId) return;
    setFetchingGSheets(true);
    setError(null);
    try {
      const data = await safeFetchJSON('/api/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: sheetsConfig.clientId,
          clientSecret: sheetsConfig.clientSecret,
          accessToken: sheetsConfig.accessToken,
          refreshToken: sheetsConfig.refreshToken,
          expiryDate: sheetsConfig.tokenExpiry,
          spreadsheetId
        })
      });

      if (data.tokenUpdate) {
        onSheetsConfigChange({
          ...sheetsConfig,
          accessToken: data.tokenUpdate.accessToken,
          refreshToken: data.tokenUpdate.refreshToken,
          tokenExpiry: data.tokenUpdate.expiryDate
        });
      }

      setSheetTabs(data.sheets || []);
      if (data.sheets?.length > 0) {
        setSelectedTab(data.sheets[0].title);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load sheets tabs.");
    } finally {
      setFetchingGSheets(false);
    }
  };

  // Import from connected Google Sheet values
  const importGoogleSheet = async () => {
    if (!selectedSpreadsheet || !selectedTab) {
      setError("Please select a spreadsheet and sheet tab first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await safeFetchJSON('/api/google/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: sheetsConfig.clientId,
          clientSecret: sheetsConfig.clientSecret,
          accessToken: sheetsConfig.accessToken,
          refreshToken: sheetsConfig.refreshToken,
          expiryDate: sheetsConfig.tokenExpiry,
          spreadsheetId: selectedSpreadsheet,
          range: `${selectedTab}!A1:Z500`
        })
      });

      if (data.tokenUpdate) {
        onSheetsConfigChange({
          ...sheetsConfig,
          accessToken: data.tokenUpdate.accessToken,
          refreshToken: data.tokenUpdate.refreshToken,
          tokenExpiry: data.tokenUpdate.expiryDate
        });
      }

      const rows = data.values || [];
      if (rows.length < 2) {
        throw new Error("This sheet has no data or less than 2 rows (header + content rows required).");
      }

      // Convert Sheet values matrix to tabular string format so we can leverage the exact same standard parser
      const formattedText = rows.map((row: any[]) => 
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      parseSpreadsheetData(formattedText);
    } catch (e: any) {
      setError(e.message || "Failed to import sheet values.");
    } finally {
      setLoading(false);
    }
  };

  // Parse raw text string (CSV, TSV, Copy-pasted spreadsheet)
  const parseSpreadsheetData = (text: string) => {
    setError(null);
    if (!text.trim()) {
      setError("Please paste some valid spreadsheet or CSV data.");
      return;
    }

    try {
      // Split into lines
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        setError("Data must contain at least a header row and one contact row.");
        return;
      }

      // Determine separator: comma, tab, or semicolon
      const firstLine = lines[0];
      let separator = ',';
      if (firstLine.includes('\t')) separator = '\t';
      else if (firstLine.includes(';')) separator = ';';

      // Simple CSV parser that handles quotes
      const parseCSVLine = (line: string, sep: string) => {
        const result: string[] = [];
        let insideQuote = false;
        let entry = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === sep && !insideQuote) {
            result.push(entry.trim());
            entry = '';
          } else {
            entry += char;
          }
        }
        result.push(entry.trim());
        // Strip outer quotes if any
        return result.map(s => s.replace(/^"(.*)"$/, '$1'));
      };

      const headers = parseCSVLine(lines[0], separator);
      
      // Look for Email and Name columns in a case-insensitive manner
      let emailIndex = -1;
      let nameIndex = -1;

      // Detect which column contains email addresses by scanning rows
      const colEmailCounts: number[] = Array(headers.length).fill(0);
      const scanRowsLimit = Math.min(lines.length, 25);
      for (let i = 0; i < scanRowsLimit; i++) {
        const row = parseCSVLine(lines[i], separator);
        row.forEach((cell, idx) => {
          const trimmedCell = (cell || '').trim();
          if (trimmedCell && trimmedCell.includes('@') && trimmedCell.length > 3) {
            colEmailCounts[idx] = (colEmailCounts[idx] || 0) + 1;
          }
        });
      }

      // Find column with most emails
      let maxEmailCount = 0;
      for (let idx = 0; idx < colEmailCounts.length; idx++) {
        if (colEmailCounts[idx] > maxEmailCount) {
          maxEmailCount = colEmailCounts[idx];
          emailIndex = idx;
        }
      }

      // If scanner didn't find emails, search headers
      if (emailIndex === -1) {
        emailIndex = headers.findIndex(h => /email|mail|address|to/i.test(h));
      }

      // Fallback matching if exact names aren't clear
      if (emailIndex === -1) emailIndex = 1 < headers.length ? 1 : 0;

      // Find Name index
      nameIndex = headers.findIndex(h => /name|firstname|first_name|fullName|user|contact/i.test(h));
      if (nameIndex === -1 || nameIndex === emailIndex) {
        // Find a column that isn't the email column
        nameIndex = headers.findIndex((h, idx) => idx !== emailIndex);
      }
      if (nameIndex === -1) nameIndex = 0;

      const contacts: Contact[] = [];
      let skippedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i], separator);
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const email = row[emailIndex] || '';
        const name = row[nameIndex] || `Recipient #${i}`;

        // Build additional extra details that can be utilized as template placeholders
        const extraData: Record<string, string> = {};
        headers.forEach((header, idx) => {
          if (idx !== emailIndex && idx !== nameIndex && row[idx]) {
            extraData[header.trim()] = row[idx].trim();
          }
        });

        // Skip rows where email address is completely empty or missing ("jis mail ka mail addres found nahi ho rhaah us ko chor edoo")
        if (!email.trim() || !email.includes('@')) {
          const reason = !email.trim() ? "No email address found" : "Invalid email address format";
          contacts.push({
            id: `c_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
            name: name.trim(),
            email: email.trim(),
            status: 'Skipped',
            errorMessage: reason,
            extraData
          });
          skippedCount++;
          continue;
        }

        contacts.push({
          id: `c_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
          name: name.trim(),
          email: email.trim(),
          status: 'Pending',
          extraData
        });
      }

      if (contacts.length === 0) {
        setError(`No valid emails found to import. (Skipped ${skippedCount} empty/invalid entries)`);
        return;
      }

      onImport(contacts);
      setPasteData('');
      setSheetUrl('');
    } catch (e: any) {
      setError(`Failed to parse spreadsheet data: ${e.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseSpreadsheetData(text);
      setLoading(false);
    };
    reader.onerror = () => {
      setError("Failed to read the uploaded file.");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleGoogleSheetsUrlFetch = async () => {
    if (!sheetUrl.trim()) {
      setError("Please enter a valid Google Sheet share or export link.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let csvUrl = sheetUrl.trim();
      
      // If it's a standard Google Sheet share link, convert it to the direct CSV export URL
      const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }

      const res = await fetch(csvUrl);
      if (!res.ok) {
        throw new Error("Make sure the sheet is shared as 'Anyone with the link can view' so we can parse it.");
      }

      const text = await res.text();
      parseSpreadsheetData(text);
    } catch (e: any) {
      setError(`Error fetching from Google Sheets URL: ${e.message}. For private sheets, download as CSV or use the Google Account Tab.`);
    } finally {
      setLoading(false);
    }
  };

  const loadExampleData = () => {
    const example = `Full Name,Email Address,Company,Offer Details\nRahul Kumar,rahul@example.com,Fintech Labs,20% discount on API integration\nSneha Patel,sneha@example.com,HealthAI,customized patient care blueprint\nSarah Jenkins,sarah@designcorp.co,DesignCorp,complimentary audit of your checkout screen\nInvalid Recipient,,\nAmit Sharma,amit@sharmaconsulting.in,Consulting Group,free digital workspace workflow setup`;
    setPasteData(example);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Recipient Sheet</h2>
            <p className="text-xs text-gray-500">Provide user names, emails, and custom column fields for variables.</p>
          </div>
        </div>
        {currentCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 self-start sm:self-center">
            {currentCount} Contacts Loaded
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        <button
          onClick={() => { setActiveTab('paste'); setError(null); }}
          className={`py-1.5 text-[10.5px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeTab === 'paste' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clipboard className="w-3.5 h-3.5" />
          Paste
        </button>
        <button
          onClick={() => { setActiveTab('upload'); setError(null); }}
          className={`py-1.5 text-[10.5px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeTab === 'upload' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
        <button
          onClick={() => { setActiveTab('url'); setError(null); }}
          className={`py-1.5 text-[10.5px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeTab === 'url' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Link className="w-3.5 h-3.5" />
          Link
        </button>
        <button
          onClick={() => { setActiveTab('drive'); setError(null); }}
          className={`py-1.5 text-[10.5px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeTab === 'drive' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Account
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-800 p-3.5 rounded-xl border border-red-100 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Import Error:</span> {error}
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === 'paste' && (
        <div className="space-y-3 animate-fade-in">
          <textarea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder={`Paste columns from Google Sheets here directly, or CSV data.
E.g.:
Full Name\tEmail Address\tCompany
Yashraj\tyash@example.com\tAI Studios
Alex G\talex@salesgroup.org\tGlobal Sales`}
            rows={5}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={loadExampleData}
              type="button"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Load sandbox demo data
            </button>
            <button
              onClick={() => parseSpreadsheetData(pasteData)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
            >
              Parse & Import
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/10 cursor-pointer rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center gap-2.5 animate-fade-in"
        >
          <div className="p-3 bg-white rounded-full shadow-sm text-gray-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700">Click to upload or drag CSV file</p>
            <p className="text-[10px] text-gray-400 mt-1">Accepts comma-separated (.csv), tab-separated (.tsv), or plain (.txt) spreadsheets</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {activeTab === 'url' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="Paste Google Sheets Share Link"
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
            <button
              disabled={loading}
              onClick={handleGoogleSheetsUrlFetch}
              className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link className="w-3.5 h-3.5" />
              )}
              Fetch Sheet
            </button>
          </div>
          <p className="text-[10px] text-gray-400">
            Ensure your Google Sheet is shared with "Anyone with the link can view". The app will pull the columns directly and parse contact structures automatically.
          </p>
        </div>
      )}

      {activeTab === 'drive' && (
        <div className="space-y-3 animate-fade-in">
          {!sheetsConfig.isConnected ? (
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-center text-xs text-amber-900 space-y-2">
              <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
              <p className="font-semibold">Google Account Not Connected</p>
              <p className="text-[11px] text-amber-700 max-w-xs mx-auto">
                Go to the <b>Connections &amp; API Keys</b> settings in Step 1 (sidebar), click <b>GSheets</b> tab, and link your real Google Account first to import sheets from Drive.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Connected details */}
              <div className="flex justify-between items-center bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Linked with: <b>{sheetsConfig.connectedEmail}</b></span>
                </div>
                <button
                  type="button"
                  onClick={loadSpreadsheets}
                  className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3 h-3 animate-spin-hover" />
                  Refresh
                </button>
              </div>

              {fetchingGSheets ? (
                <div className="py-6 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                  <p>Accessing Google Drive &amp; spreadsheets...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* Spreadsheet selector */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Choose Spreadsheet
                    </label>
                    <select
                      value={selectedSpreadsheet}
                      onChange={(e) => {
                        setSelectedSpreadsheet(e.target.value);
                        loadSheetTabs(e.target.value);
                      }}
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {spreadsheets.length === 0 ? (
                        <option value="">No Spreadsheets Found</option>
                      ) : (
                        spreadsheets.map(file => (
                          <option key={file.id} value={file.id}>{file.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Sheet Tab selector */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Choose Sheet Tab
                    </label>
                    <select
                      value={selectedTab}
                      onChange={(e) => setSelectedTab(e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {sheetTabs.length === 0 ? (
                        <option value="">No Tabs Found</option>
                      ) : (
                        sheetTabs.map(s => (
                          <option key={s.title} value={s.title}>{s.title}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )}

              <button
                disabled={loading || spreadsheets.length === 0}
                onClick={importGoogleSheet}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                Fetch &amp; Import from Google Sheet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Warning for skip logic */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2.5 text-[11px] text-gray-500">
        <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-gray-600">Auto-Skips Blank Emails:</span> If any row is missing an email address, or has an invalid format, the cold mailer will bypass that contact safely so your campaign flow is never broken.
        </div>
      </div>
    </div>
  );
}
