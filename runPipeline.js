require("dotenv").config();
const { authorize } = require("./gmailAuth");
const { getEmails } = require("./gmailFetch");
const { parseJobWithAI } = require("./aiParser");
const { createJobEntry, findExistingJob, updateJobEntry, updateStatus } = require("./notion");
const { scoreJob } = require("./scorer");

async function normalize(job) {
  return {
    ...job,
    location: job.location
      ?.replace(/100%\s*Remote/i, "Remote")
      ?.replace(/Remote role/i, "Remote")
      || "Unknown",
  };
}

function getPriority(score) {
  if (score >= 8) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

function getFollowUpDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString();
}

// Job boards and aggregators — tag source instead of blocking
const JOB_BOARDS = [
  "indeed",
  "linkedin",
  "handshake",
  "glassdoor",
  "ziprecruiter",
  "monster",
  "careerbuilder",
  "simplyhired",
  "dice",
  "github",
  "great value hiring",
  "code the future of banking",
];

function getSource(company) {
  const lower = company.toLowerCase();
  if (JOB_BOARDS.some((board) => lower.includes(board))) {
    return company; // use the job board name as the source
  }
  return "Gmail";
}

function isValidJob(job) {
  const invalidRoles = ["Job Opportunity", "Unknown Role", "Opportunity", "Hiring", "Hiring Now", "Career", "Remote Role", ""];
  const invalidCompanies = ["", "Unknown"];

  if (invalidRoles.includes(job.role?.trim())) {
    console.log("⚠️ Low confidence job skipped:", job);
    return false;
  }

  if (!job.company || invalidCompanies.includes(job.company.trim())) {
    console.log("⚠️ Missing company, skipping:", job);
    return false;
  }

  return true;
}

async function run() {
  const auth = await authorize();
  const emails = await getEmails(auth);
  const seen = new Set();

  for (const email of emails) {
    // Step 1: AI parse
    const job = await parseJobWithAI(email);

    // Step 2: Normalize
    const cleanJob = await normalize(job);

    console.log("🤖 AI Parsed:", cleanJob);

    // Step 2: Filter non-job emails
    if (!cleanJob.isJobEmail) {
      console.log("🚫 Not a job email, skipping:", email.subject);
      continue;
    }

    // Step 2b: Handle application status updates
    if (cleanJob.applicationUpdate) {
      console.log("📬 Application update detected:", cleanJob.company);
      const existingPageId = await findExistingJob(cleanJob.company, cleanJob.role || "");

      if (existingPageId) {
        await updateJobEntry(existingPageId, {
          score: 0,
          priority: "Low",
          followUpDate: getFollowUpDate(),
          source: getSource(cleanJob.company),
          salary: "",
          note: email.subject,
        });
        console.log("📋 Note added to Notion — update status manually:", cleanJob.company);
      } else {
        console.log("⚠️ No existing entry found for:", cleanJob.company, "— skipping");
      }
      continue;
    }

    // Step 3: Validate
    if (!isValidJob(cleanJob)) {
      console.log("⚠️ Skipping invalid AI output:", cleanJob);
      continue;
    }

    // Step 4: Dedupe — in-memory (current run)
    const key = `${cleanJob.company.toLowerCase()}::${cleanJob.role.toLowerCase()}::${cleanJob.location?.toLowerCase() || "unknown"}`;
    if (seen.has(key)) {
      console.log("⏭️ Skipping duplicate (in-run):", key);
      continue;
    }
    seen.add(key);

    // Step 5: Score + Priority (before Notion check so update has fresh score)
    const scoredJob = { ...cleanJob, score: scoreJob(cleanJob) };
    const priority = getPriority(scoredJob.score);
    const followUpDate = getFollowUpDate();

    console.log(`📊 Job Score: ${scoredJob.score} | Priority: ${priority}`);

    // High-priority alert
    if (scoredJob.score >= 8) {
      console.log("🚨 HIGH PRIORITY JOB DETECTED:", scoredJob.company, "—", scoredJob.role);
    }

    // Step 6: Dedupe — cross-run (check Notion, update if exists)
    const existingPageId = await findExistingJob(cleanJob.company, cleanJob.role);
    if (existingPageId) {
      console.log("🔄 Already exists, updating Last Contacted:", key);
      await updateJobEntry(existingPageId, {
        score: scoredJob.score,
        priority,
        followUpDate,
        source: getSource(scoredJob.company),
        salary: scoredJob.salary || "",
        summary: scoredJob.summary || "",
      });
      console.log("✅ Updated in Notion");
      continue;
    }

    // Step 7: Insert new entry
    await createJobEntry({
      company: scoredJob.company,
      role: scoredJob.role,
      source: getSource(scoredJob.company),
      status: "New",
      score: scoredJob.score,
      priority,
      followUpDate,
      salary: scoredJob.salary || "",
      summary: scoredJob.summary || "",
    });

    console.log("✅ Sent to Notion");
  }
}

run();