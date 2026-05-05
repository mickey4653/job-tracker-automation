require("dotenv").config();
const { authorize } = require("./gmailAuth");
const { getEmails } = require("./gmailFetch");
const { parseJobWithAI } = require("./aiParser");
const { createJobEntry, findExistingJob, updateJobEntry } = require("./notion");
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
      });
      console.log("✅ Updated in Notion");
      continue;
    }

    // Step 7: Insert new entry
    await createJobEntry({
      company: scoredJob.company,
      role: scoredJob.role,
      source: "Gmail",
      status: "Applied",
      score: scoredJob.score,
      priority,
      followUpDate,
    });

    console.log("✅ Sent to Notion");
  }
}

run();