export interface Contact {
  id: string;
  name: string;
  email: string;
  status: 'Pending' | 'Sending' | 'Sent' | 'Failed' | 'Skipped';
  spamRiskScore?: number;
  spamRiskStatus?: string;
  placement?: 'Inbox' | 'Spam Folder' | 'Unknown';
  errorMessage?: string;
  messageId?: string;
  sentAt?: string;
  // Dynamic columns imported from csv
  extraData?: Record<string, string>;
}

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  region: 'us' | 'eu';
  fromName: string;
  fromEmail: string;
}

export interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  isConnected: boolean;
  connectedEmail?: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  aiPersonalize: boolean;
  aiProvider: 'openai' | 'gemini';
}

export interface SpamCheckResult {
  score: number;
  status: 'Excellent' | 'Good' | 'Moderate Risk' | 'High Spam Risk';
  spammyTriggers: string[];
  suggestions: string[];
  subjectAnalysis: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  avgSpamRisk: number;
  spamCount: number;
}
