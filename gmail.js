// gmail.js
const { google } = require("googleapis");

async function getEmails(auth) {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.list({
    userId: "me",
    q: "subject:(application OR interview OR opportunity)",
  });

  return res.data.messages || [];
}

module.exports = { getEmails };