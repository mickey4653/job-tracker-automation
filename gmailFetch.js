const { google } = require("googleapis");

async function getEmails(auth) {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 5,
    q: "subject:(application OR interview OR recruiter OR opportunity)",
  });

  const messages = res.data.messages || [];

  const fullEmails = [];

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
    });

    const payload = full.data.payload;
    const headers = payload.headers;

    const subject = headers.find(h => h.name === "Subject")?.value;
    const from = headers.find(h => h.name === "From")?.value;

    fullEmails.push({
      id: msg.id,
      subject,
      from,
    });
  }

  return fullEmails;
}

module.exports = { getEmails };