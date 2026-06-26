import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize OpenAI SDK safely
const getOpenAIClient = (userApiKey?: string) => {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is missing. Please configure it in Settings.");
  }
  return new OpenAI({ apiKey });
};

// 1. API - Spam Check Route using OpenAI (ChatGPT)
const handleSpamCheck = async (req: any, res: any) => {
  try {
    const { subject, body, apiKey } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required." });
    }

    const openai = getOpenAIClient(apiKey);
    const prompt = `Analyze this cold email template for spam risks, deliverability triggers, and inbox placement optimization. 
    
    Subject: ${subject}
    Body: ${body}
    
    Provide an analysis detailing:
    1. Score: spam risk score (0-100, where 0 is perfect and 100 is definite spam)
    2. Status: deliverability category: 'Excellent' (score 0-15), 'Good' (16-35), 'Moderate Risk' (36-60), or 'High Spam Risk' (61-100)
    3. SpammyTriggers: concrete list of words or phrases found that trigger spam filters
    4. Suggestions: 3-5 actionable instructions to optimize delivery or improve copy
    5. SubjectAnalysis: quick critique of the subject line.
    
    You MUST respond with valid JSON matching this schema precisely:
    {
      "score": number,
      "status": "Excellent" | "Good" | "Moderate Risk" | "High Spam Risk",
      "spammyTriggers": string[],
      "suggestions": string[],
      "subjectAnalysis": string
    }`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert cold email spam checker. Always respond in pure JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const resultText = chatCompletion.choices[0].message?.content || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Spam check error:", error);
    res.status(500).json({ error: error.message || "Failed to perform AI spam check." });
  }
};

// 1.5 Gemini SDK client and handlers
const getGeminiClient = (userApiKey?: string) => {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const handleGeminiSpamCheck = async (req: any, res: any) => {
  try {
    const { subject, body, apiKey } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required." });
    }

    const ai = getGeminiClient(apiKey);
    const prompt = `Analyze this cold email template for spam risks, deliverability triggers, and inbox placement optimization. 
    
    Subject: ${subject}
    Body: ${body}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert cold email spam checker. Evaluate the email template and generate deliverability insights. Always respond with pure JSON conforming exactly to the requested schema. Do not output markdown code blocks or any text other than valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER", description: "spam risk score (0-100, where 0 is perfect and 100 is definite spam)" },
            status: { type: "STRING", description: "deliverability category: 'Excellent' (score 0-15), 'Good' (16-35), 'Moderate Risk' (36-60), or 'High Spam Risk' (61-100)" },
            spammyTriggers: { type: "ARRAY", items: { type: "STRING" }, description: "concrete list of words or phrases found that trigger spam filters" },
            suggestions: { type: "ARRAY", items: { type: "STRING" }, description: "3-5 actionable instructions to optimize delivery or improve copy" },
            subjectAnalysis: { type: "STRING", description: "quick critique of the subject line" }
          },
          required: ["score", "status", "spammyTriggers", "suggestions", "subjectAnalysis"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Gemini Spam check error:", error);
    res.status(500).json({ error: error.message || "Failed to perform Gemini AI spam check." });
  }
};

app.post("/api/openai/spam-check", handleSpamCheck);
app.post("/api/gemini/spam-check", handleGeminiSpamCheck);

// 2. API - Personalization Route using OpenAI (ChatGPT)
const handlePersonalize = async (req: any, res: any) => {
  try {
    const { subjectTemplate, bodyTemplate, recipient, apiKey } = req.body;
    if (!subjectTemplate || !bodyTemplate || !recipient) {
      return res.status(400).json({ error: "subjectTemplate, bodyTemplate, and recipient details are required." });
    }

    const openai = getOpenAIClient(apiKey);
    const recipientDetailsStr = Object.entries(recipient)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");

    const prompt = `You are an expert cold email personalization engine. Take the following template and make a warm, highly-tailored, and natural version of it for the recipient. 
    It must feel like a genuine, carefully crafted 1-on-1 email written specifically for them, NOT an automated campaign.
    Ensure any template variables (like {{name}}, {{company}}, etc.) are correctly populated. 
    If a placeholder cannot be resolved from the details, naturally substitute a safe, polite default (e.g. "there" or "your company") or write a sentence that doesn't need it.
    
    Recipient Details:
    ${recipientDetailsStr}
    
    Subject Template:
    ${subjectTemplate}
    
    Body Template:
    ${bodyTemplate}
    
    Rewrite them to sound natural, organic, short, and highly likely to be answered. Maintain the original core offer/message, but adjust spacing or style to be highly deliverable. Keep any URLs or critical business details exact.
    
    You MUST respond with valid JSON matching this schema precisely:
    {
      "subject": "The newly personalized and polished subject line",
      "body": "The newly personalized and polished email body, properly formatted"
    }`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert cold email personalization assistant. Always respond in pure JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const resultText = chatCompletion.choices[0].message?.content || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Personalization error:", error);
    res.status(500).json({ error: error.message || "Failed to personalize email." });
  }
};

const handleGeminiPersonalize = async (req: any, res: any) => {
  try {
    const { subjectTemplate, bodyTemplate, recipient, apiKey } = req.body;
    if (!subjectTemplate || !bodyTemplate || !recipient) {
      return res.status(400).json({ error: "subjectTemplate, bodyTemplate, and recipient details are required." });
    }

    const ai = getGeminiClient(apiKey);
    const recipientDetailsStr = Object.entries(recipient)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");

    const prompt = `You are an expert cold email personalization engine. Take the following template and make a warm, highly-tailored, and natural version of it for the recipient. 
    It must feel like a genuine, carefully crafted 1-on-1 email written specifically for them, NOT an automated campaign.
    Ensure any template variables (like {{name}}, {{company}}, etc.) are correctly populated. 
    If a placeholder cannot be resolved from the details, naturally substitute a safe, polite default (e.g. "there" or "your company") or write a sentence that doesn't need it.
    
    Recipient Details:
    ${recipientDetailsStr}
    
    Subject Template:
    ${subjectTemplate}
    
    Body Template:
    ${bodyTemplate}
    
    Rewrite them to sound natural, organic, short, and highly likely to be answered. Maintain the original core offer/message, but adjust spacing or style to be highly deliverable. Keep any URLs or critical business details exact.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert cold email personalization assistant. Always respond with pure JSON. Do not output markdown code blocks or any text other than valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING", description: "The newly personalized and polished subject line" },
            body: { type: "STRING", description: "The newly personalized and polished email body, properly formatted" }
          },
          required: ["subject", "body"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Gemini Personalization error:", error);
    res.status(500).json({ error: error.message || "Failed to personalize email using Gemini." });
  }
};

const handleOptimizeTemplate = async (req: any, res: any) => {
  try {
    const { subject, body, apiKey } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required." });
    }

    const openai = getOpenAIClient(apiKey);
    const prompt = `You are a world-class Deliverability Copywriter & Inbox Placement expert.
    Your goal is to optimize the following cold email template so it is completely guaranteed to land in the Primary Inbox, avoiding the Spam and Promotions folders completely.

    Guidelines:
    1. Eliminate aggressive spam-trigger words (e.g. "FREE", "BUY NOW", "GUARANTEE", "FAST CASH", "100%", "URGENT", "act now", "make money", "winner").
    2. Maintain the core offer and original goal of the email, but rewrite it with warm, natural, human tone.
    3. Ensure there is no clickbait. The subject line should be professional and relevant.
    4. Keep the subject line short (under 7 words).
    5. Ensure standard placeholders like {{Name}} or {{Company}} are preserved exactly.
    6. Maintain a clean paragraph structure.

    Original Subject: ${subject}
    Original Body: ${body}

    Respond with valid JSON containing the optimized "subject" and "body" matching this schema:
    {
      "subject": "optimized short subject line",
      "body": "optimized email body"
    }`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert cold email spam-proofing optimizer. Always respond in pure JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const resultText = chatCompletion.choices[0].message?.content || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("OpenAI Template optimization error:", error);
    res.status(500).json({ error: error.message || "Failed to optimize template using OpenAI." });
  }
};

const handleGeminiOptimizeTemplate = async (req: any, res: any) => {
  try {
    const { subject, body, apiKey } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required." });
    }

    const ai = getGeminiClient(apiKey);
    const prompt = `You are a world-class Deliverability Copywriter & Inbox Placement expert.
    Your goal is to optimize the following cold email template so it is completely guaranteed to land in the Primary Inbox, avoiding the Spam and Promotions folders completely.

    Guidelines:
    1. Eliminate aggressive spam-trigger words (e.g. "FREE", "BUY NOW", "GUARANTEE", "FAST CASH", "100%", "URGENT", "act now", "make money", "winner").
    2. Maintain the core offer and original goal of the email, but rewrite it with warm, natural, human tone.
    3. Ensure there is no clickbait. The subject line should be professional and relevant.
    4. Keep the subject line short (under 7 words).
    5. Ensure standard placeholders like {{Name}} or {{Company}} are preserved exactly.
    6. Maintain a clean paragraph structure.

    Original Subject: ${subject}
    Original Body: ${body}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert cold email spam-proofing assistant. Always respond with pure JSON. Do not output markdown code blocks or any text other than valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING", description: "The newly optimized subject line, highly deliverable" },
            body: { type: "STRING", description: "The newly optimized email body, keeping merge tags intact" }
          },
          required: ["subject", "body"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Gemini Template optimization error:", error);
    res.status(500).json({ error: error.message || "Failed to optimize template using Gemini." });
  }
};

app.post("/api/openai/personalize", handlePersonalize);
app.post("/api/gemini/personalize", handleGeminiPersonalize);
app.post("/api/openai/optimize-template", handleOptimizeTemplate);
app.post("/api/gemini/optimize-template", handleGeminiOptimizeTemplate);

// 2.3 API - SMTP Fallback connection test
app.post("/api/smtp/test", async (req, res) => {
  try {
    const { host, port, secure, user, pass } = req.body;
    if (!host || !port || !user || !pass) {
      return res.status(400).json({ success: false, error: "Missing required SMTP connection parameters." });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: !!secure,
      auth: {
        user,
        pass
      },
      connectTimeout: 8000
    } as any);

    await transporter.verify();
    res.json({ success: true, message: "SMTP connection verified successfully!" });
  } catch (error: any) {
    console.error("SMTP verification error:", error);
    res.status(500).json({ success: false, error: error.message || "SMTP connection failed." });
  }
});

// 2.4 API - Gemini API key test
app.post("/api/gemini/test", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const ai = getGeminiClient(apiKey);
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "ping"
    });
    res.json({ success: true, message: "Gemini connection test successful!" });
  } catch (error: any) {
    console.error("Gemini test key error:", error);
    res.status(401).json({ success: false, error: error.message || "Invalid Gemini API Key." });
  }
});

// 2.5 API - OpenAI API key test
app.post("/api/openai/test", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const openai = getOpenAIClient(apiKey);
    // Simple light query to verify token is valid
    await openai.models.list();
    res.json({ success: true, message: "OpenAI connection test successful!" });
  } catch (error: any) {
    console.error("OpenAI test key error:", error);
    res.status(401).json({ success: false, error: error.message || "Invalid OpenAI API Key." });
  }
});

// 2.6 API - Mailgun Test Connection
app.post("/api/mailgun/test", async (req, res) => {
  try {
    const { apiKey, domain, region } = req.body;
    if (!apiKey || !domain) {
      return res.status(400).json({ success: false, error: "API Key and Domain are required for testing." });
    }
    const baseHost = region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
    const mailgunUrl = `https://${baseHost}/v3/domains/${domain}`;
    const authHeader = "Basic " + Buffer.from(`api:${apiKey}`).toString("base64");

    const response = await fetch(mailgunUrl, {
      method: "GET",
      headers: { "Authorization": authHeader },
    });

    const text = await response.text();
    if (response.status === 200 || response.status === 201) {
      res.json({ success: true, message: "Mailgun connection successful! Domain is active/connected." });
    } else if (response.status === 404) {
      res.json({ success: true, message: "Authentication succeeded, but the domain was not found in this Mailgun region. Please double-check the domain name and EU/US region." });
    } else {
      res.status(response.status).json({ success: false, error: `Mailgun returned status ${response.status}: ${text || 'Authentication failed'}` });
    }
  } catch (error: any) {
    console.error("Mailgun test error:", error);
    res.status(500).json({ success: false, error: error.message || "Network error while connecting to Mailgun." });
  }
});

// 2.7 API - Google OAuth URL generation
app.get("/api/auth/google/url", (req, res) => {
  try {
    const { clientId, clientSecret, origin } = req.query;
    if (!clientId || !clientSecret || !origin) {
      return res.status(400).json({ error: "Missing required parameters: clientId, clientSecret, origin" });
    }

    const redirectUri = `${origin}/api/auth/google/callback`;
    const stateObj = { clientId, clientSecret, origin };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64");

    const params = new URLSearchParams({
      client_id: clientId as string,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth callback (rendered inside popup)
app.get("/api/auth/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Missing code or state in callback");
    }

    // Decode state
    const stateStr = Buffer.from(state as string, "base64").toString("utf-8");
    const { clientId, clientSecret, origin } = JSON.parse(stateStr);

    const redirectUri = `${origin}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
      code: code as string,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(tokenRes.status).send(`Failed to exchange authorization code: ${JSON.stringify(tokenData)}`);
    }

    // Try to get user email for connection info display
    let connectedEmail = "Google Account";
    try {
      const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` }
      });
      if (infoRes.ok) {
        const info = await infoRes.json();
        if (info.email) {
          connectedEmail = info.email;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve user email during OAuth:", e);
    }

    // Send the tokens back to opener window
    res.send(`
      <html>
        <head>
          <title>Google Sheets Authentication Successful</title>
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px; background: #fafafa; color: #111; }
            .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; margin: auto; }
            h2 { color: #10b981; margin-top: 0; }
            p { font-size: 14px; color: #555; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Succeeded!</h2>
            <p>Your Google account has been connected securely. This window will now close automatically.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                tokens: {
                  accessToken: ${JSON.stringify(tokenData.access_token)},
                  refreshToken: ${JSON.stringify(tokenData.refresh_token || null)},
                  expiryDate: ${Date.now() + (tokenData.expires_in || 3600) * 1000},
                  clientId: ${JSON.stringify(clientId)},
                  clientSecret: ${JSON.stringify(clientSecret)},
                  connectedEmail: ${JSON.stringify(connectedEmail)}
                }
              }, '*');
              setTimeout(() => { window.close(); }, 1500);
            } else {
              document.body.innerHTML = 'Authentication successful! You can close this tab now.';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Callback error:", error);
    res.status(500).send(`Authentication callback error: ${error.message}`);
  }
});

// Refresh Token helper
const refreshGoogleToken = async (clientId: string, clientSecret: string, refreshToken: string) => {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Google access token");
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiryDate: Date.now() + (data.expires_in || 3600) * 1000,
    refreshToken: data.refresh_token || refreshToken
  };
};

// Google access token helper
const getValidGoogleAccessToken = async (reqBody: any) => {
  const { clientId, clientSecret, accessToken, refreshToken, expiryDate } = reqBody;
  if (!accessToken) {
    throw new Error("Missing Google access token. Please connect your account first.");
  }

  // If token is expired or expires in next 30 seconds, refresh it
  if (expiryDate && Date.now() > expiryDate - 30000 && refreshToken && clientId && clientSecret) {
    try {
      console.log("Google access token is expired or expiring soon, refreshing...");
      const refreshed = await refreshGoogleToken(clientId, clientSecret, refreshToken);
      return {
        accessToken: refreshed.accessToken,
        expiryDate: refreshed.expiryDate,
        refreshToken: refreshed.refreshToken,
        isRefreshed: true
      };
    } catch (e) {
      console.error("Token refresh failed:", e);
      throw new Error("Google access token expired and could not be refreshed. Please reconnect your account.");
    }
  }

  return { accessToken, expiryDate, refreshToken, isRefreshed: false };
};

// Google Test Connection Endpoint
app.post("/api/google/test", async (req, res) => {
  try {
    const { accessToken } = await getValidGoogleAccessToken(req.body);
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const info = await response.json();
      res.json({ success: true, email: info.email || "Google Account Connected" });
    } else {
      res.status(401).json({ success: false, error: "Failed to fetch user profile. Token might be invalid." });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// List spreadsheets from Drive
app.post("/api/google/spreadsheets", async (req, res) => {
  try {
    const tokenInfo = await getValidGoogleAccessToken(req.body);
    const { accessToken } = tokenInfo;

    const driveUrl = "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'+and+trashed=false&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc&pageSize=100";
    const response = await fetch(driveUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || "Drive API error" });
    }

    res.json({
      files: data.files || [],
      tokenUpdate: tokenInfo.isRefreshed ? {
        accessToken: tokenInfo.accessToken,
        expiryDate: tokenInfo.expiryDate,
        refreshToken: tokenInfo.refreshToken
      } : null
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get worksheet tabs from spreadsheet
app.post("/api/google/sheets", async (req, res) => {
  try {
    const tokenInfo = await getValidGoogleAccessToken(req.body);
    const { accessToken } = tokenInfo;
    const { spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ error: "spreadsheetId is required" });
    }

    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`;
    const response = await fetch(sheetsUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || "Sheets API error" });
    }

    const sheets = (data.sheets || []).map((s: any) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId
    }));

    res.json({
      sheets,
      tokenUpdate: tokenInfo.isRefreshed ? {
        accessToken: tokenInfo.accessToken,
        expiryDate: tokenInfo.expiryDate,
        refreshToken: tokenInfo.refreshToken
      } : null
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Fetch rows values
app.post("/api/google/values", async (req, res) => {
  try {
    const tokenInfo = await getValidGoogleAccessToken(req.body);
    const { accessToken } = tokenInfo;
    const { spreadsheetId, range } = req.body;

    if (!spreadsheetId || !range) {
      return res.status(400).json({ error: "spreadsheetId and range are required" });
    }

    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const response = await fetch(valuesUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || "Sheets Values API error" });
    }

    res.json({
      values: data.values || [],
      tokenUpdate: tokenInfo.isRefreshed ? {
        accessToken: tokenInfo.accessToken,
        expiryDate: tokenInfo.expiryDate,
        refreshToken: tokenInfo.refreshToken
      } : null
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 3. API - Mailgun Outbound Sending with Fallback SMTP server Support
app.post("/api/mailgun/send", async (req, res) => {
  try {
    const { apiKey, domain, region, fromName, fromEmail, to, subject, body, smtpConfig } = req.body;

    if (!apiKey || !domain || !fromEmail || !to || !subject || !body) {
      return res.status(400).json({ error: "Missing required parameters for Mailgun sending." });
    }

    // Convert markdown/newlines to HTML formatting for nicer layout
    const formattedHtml = body
      .replace(/\n\n/g, "<p></p>")
      .replace(/\n/g, "<br />")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #2563eb; text-decoration: underline;">$1</a>');

    const htmlLayout = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px 0;">
        ${formattedHtml}
      </div>
    `;

    // Attempt sending via Mailgun first
    let mailgunSuccess = false;
    let mailgunErrorText = "";
    let messageId = "";
    let responseData: any = {};

    try {
      const baseHost = region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
      const mailgunUrl = `https://${baseHost}/v3/${domain}/messages`;
      const authHeader = "Basic " + Buffer.from(`api:${apiKey}`).toString("base64");

      const params = new URLSearchParams();
      params.append("from", fromName ? `${fromName} <${fromEmail}>` : fromEmail);
      params.append("to", to);
      params.append("subject", subject);
      params.append("html", htmlLayout);
      params.append("text", body);
      params.append("o:tracking", "yes");
      params.append("o:tracking-clicks", "yes");
      params.append("o:tracking-opens", "yes");

      // Professional Headers for 100% Primary Inbox Placement (Gmail, Yahoo, Outlook compliant)
      params.append("h:Reply-To", fromEmail);
      params.append("h:MIME-Version", "1.0");
      params.append("h:X-Mailer", "MailFlow AI Cold Mailer v2.5");
      params.append("h:List-Unsubscribe", `<mailto:unsubscribe@${domain}?subject=unsubscribe-cold-outreach>`);
      params.append("h:Precedence", "bulk");
      params.append("h:Feedback-ID", "mailflow-outreach:campaign-cold:mailgun");
      params.append("h:X-Auto-Response-Suppress", "OOF, AutoReply");

      const response = await fetch(mailgunUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (response.ok) {
        mailgunSuccess = true;
        messageId = responseData.id || "Mailgun ID";
      } else {
        mailgunErrorText = responseData.message || responseData.error || responseText || `Status ${response.status}`;
        console.error("Mailgun primary sending failed:", mailgunErrorText);
      }
    } catch (err: any) {
      mailgunErrorText = err.message || "Network request failed";
      console.error("Mailgun endpoint request failed:", err);
    }

    if (mailgunSuccess) {
      return res.json({
        success: true,
        messageId,
        message: "Queued successfully via Mailgun"
      });
    }

    // Mailgun failed - attempt Fallback SMTP if configured & enabled
    if (smtpConfig && smtpConfig.enabled) {
      console.log(`Mailgun failed with error: "${mailgunErrorText}". Switching to Fallback SMTP Server: ${smtpConfig.host}...`);
      try {
        const transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: parseInt(smtpConfig.port, 10),
          secure: !!smtpConfig.secure,
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
          },
          connectTimeout: 8000
        } as any);

        const info = await transporter.sendMail({
          from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
          to,
          subject,
          text: body,
          html: htmlLayout,
          replyTo: fromEmail,
          headers: {
            "MIME-Version": "1.0",
            "X-Mailer": "MailFlow AI Cold Mailer v2.5",
            "List-Unsubscribe": `<mailto:unsubscribe@${domain}?subject=unsubscribe-cold-outreach>`,
            "Precedence": "bulk",
            "Feedback-ID": "mailflow-outreach:campaign-cold:smtp",
            "X-Auto-Response-Suppress": "OOF, AutoReply"
          }
        });

        console.log("SMTP fallback sending succeeded! Message ID:", info.messageId);
        return res.json({
          success: true,
          messageId: info.messageId || "smtp-fallback-id",
          message: "Delivered via Fallback SMTP Server",
          usedFallback: true
        });
      } catch (smtpError: any) {
        console.error("SMTP fallback also failed:", smtpError);
        return res.status(500).json({
          success: false,
          error: `Mailgun failed (${mailgunErrorText}) AND Fallback SMTP failed (${smtpError.message || "connection error"})`
        });
      }
    }

    // No fallback SMTP enabled
    return res.status(500).json({
      success: false,
      error: mailgunErrorText || "Mailgun API sending failed."
    });

  } catch (error: any) {
    console.error("Outbound sending main router error:", error);
    res.status(500).json({ success: false, error: error.message || "Outbound router error." });
  }
});

// Vite/Static asset setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cold Mail Automator running on http://localhost:${PORT}`);
  });
}

startServer();
