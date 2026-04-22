const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are the virtual assistant for Peak Edge Roofing in Aurora, CO.
Owner: Danny Kowalski. He personally calls back every lead.
Serving Denver metro since 2014. GAF certified. Fully licensed and insured.

Services: roof replacement, storm damage / insurance claims, repairs, gutters.
Service area: Aurora, Denver, Lakewood, Centennial, Parker, Englewood.

YOUR ONLY JOB — in this order:
1. Find out what they need (one question max)
2. Get their name and phone number
3. Tell them Danny will call within the hour

RULES:
- 2 sentences max per response. Always.
- Never quote prices. Say "Danny will give you an exact number after a free inspection."
- Never say you're an AI. You're Danny's assistant.
- Be warm and direct. Not robotic.
- Once you have both name AND phone, confirm and end the conversation warmly.

LEAD CAPTURE: When you have collected both name AND phone, append this exact line at the very end of your message — it will be stripped before the user sees it:
[[LEAD:{"name":"NAME_HERE","phone":"PHONE_HERE","service":"SERVICE_HERE"}]]`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { messages } = JSON.parse(event.body);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages
    });

    let text = response.content[0].text.trim();
    let leadCaptured = false;

    // Extract and strip lead data
    const leadMatch = text.match(/\[\[LEAD:(\{.*?\})\]\]/);
    if (leadMatch) {
      text = text.replace(/\[\[LEAD:\{.*?\}\]\]/, '').trim();

      try {
        const lead = JSON.parse(leadMatch[1]);
        leadCaptured = true;

        // Log to Google Sheet via Apps Script webhook
        if (process.env.SHEET_WEBHOOK_URL) {
          fetch(process.env.SHEET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }),
              name: lead.name,
              phone: lead.phone,
              service: lead.service
            })
          }).catch(err => console.error('Sheet log failed:', err));
        }

        // Email notification via Resend
        if (process.env.RESEND_API_KEY) {
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: 'leads@launchedops.com',
              to: process.env.NOTIFICATION_EMAIL || 'tonyrsarabia@gmail.com',
              subject: `New Lead: ${lead.name} — ${lead.service}`,
              html: `
                <h2 style="color:#0F1C2E">New lead from Peak Edge Roofing</h2>
                <table style="border-collapse:collapse;width:100%;max-width:400px">
                  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Name</strong></td><td style="padding:8px;border:1px solid #ddd">${lead.name}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #ddd">${lead.phone}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Service</strong></td><td style="padding:8px;border:1px solid #ddd">${lead.service}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Time</strong></td><td style="padding:8px;border:1px solid #ddd">${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}</td></tr>
                </table>
              `
            })
          }).catch(err => console.error('Email failed:', err));
        }

      } catch (e) {
        console.error('Lead parse error:', e);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ text, leadCaptured })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Something went wrong. Please call us directly.' })
    };
  }
};
