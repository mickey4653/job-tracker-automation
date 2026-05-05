const { authorize } = require("../gmailAuth");
const { getEmails } = require("../gmailFetch");
const { parseJobEmail } = require("../runPipeline");
const { createJobEntry } = require("../notion");

async function run() {
  const auth = await authorize();

  const emails = await getEmails(auth);

  for (const email of emails) {
    const job = parseJobEmail(email);

    console.log("➡️ Parsed job:", job);

    await createJobEntry(job);

    console.log("✅ Sent to Notion");
  }
}

run();