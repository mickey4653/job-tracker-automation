require("dotenv").config();
const { Client } = require("@notionhq/client");
const nodemailer = require("nodemailer");

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function getWeeklyJobs() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const response = await notion.databases.query({
    database_id: process.env.DATABASE_ID,
    filter: {
      property: "Last Contacted",
      date: { on_or_after: sevenDaysAgo.toISOString() },
    },
    sorts: [{ property: "Score", direction: "descending" }],
  });

  return response.results;
}

function buildEmailBody(jobs) {
  const total = jobs.length;
  const high = jobs.filter(
    (j) => j.properties?.Priority?.select?.name === "High"
  );
  const needsFollowUp = jobs.filter(
    (j) => j.properties?.Status?.select?.name === "Applied"
  );

  const topJobs = jobs.slice(0, 5).map((j) => {
    const company = j.properties?.Company?.title?.[0]?.plain_text || "Unknown";
    const role = j.properties?.Role?.rich_text?.[0]?.plain_text || "Unknown";
    const score = j.properties?.Score?.number ?? 0;
    const priority = j.properties?.Priority?.select?.name || "Low";
    return `  • ${company} — ${role} (Score: ${score}, Priority: ${priority})`;
  });

  return `
📊 WEEKLY JOB TRACKER SUMMARY
==============================
Week ending: ${new Date().toDateString()}

Total jobs tracked this week : ${total}
High priority jobs           : ${high.length}
Still needs follow-up        : ${needsFollowUp.length}

🔥 Top Scored Jobs This Week:
${topJobs.length > 0 ? topJobs.join("\n") : "  None found this week."}

==============================
Keep pushing. You got this. 🚀
  `.trim();
}

async function sendEmail(body) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.REPORT_EMAIL_FROM,
      pass: process.env.REPORT_EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.REPORT_EMAIL_FROM,
    to: process.env.REPORT_EMAIL_TO,
    subject: `📊 Weekly Job Tracker Report — ${new Date().toDateString()}`,
    text: body,
  });

  console.log("📧 Weekly report sent to", process.env.REPORT_EMAIL_TO);
}

async function run() {
  console.log("📋 Generating weekly report...");
  const jobs = await getWeeklyJobs();
  const body = buildEmailBody(jobs);
  console.log(body);
  await sendEmail(body);
}

run();
