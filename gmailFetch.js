const { google } = require("googleapis");

// Recursively extract plain text body from Gmail message payload
function extractBody(payload) {
  if (!payload) return "";

  // Direct plain text part
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  // Multipart — recurse into parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return "";
}

async function getEmails(auth) {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 50,
    q: "subject:(application OR interview OR recruiter OR opportunity OR hiring OR role OR position)",
  });

  const messages = res.data.messages || [];
  const fullEmails = [];

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const payload = full.data.payload;
    const headers = payload.headers;

    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";

    // Extract and truncate body to keep AI prompt cost reasonable
    const rawBody = extractBody(payload);
    const body = rawBody.slice(0, 1500).trim();

    fullEmails.push({
      id: msg.id,
      subject,
      from,
      body,
    });
  }

  return fullEmails;
}

module.exports = { getEmails };
