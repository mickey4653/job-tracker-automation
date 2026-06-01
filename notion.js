// notion.js
require("dotenv").config();
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Retry wrapper for transient Notion API errors (502, 503, 504)
async function withRetry(fn, retries = 3, delayMs = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isTransient = err.status === 502 || err.status === 503 || err.status === 504;
      if (isTransient && attempt < retries) {
        console.log(`⚠️ Notion API error ${err.status} — retrying in ${delayMs / 1000}s (attempt ${attempt}/${retries})`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
}

// Returns the existing page ID if found, otherwise null
async function findExistingJob(company, role) {
  const response = await withRetry(() => notion.databases.query({
    database_id: process.env.DATABASE_ID,
    filter: {
      and: [
        { property: "Company", title: { equals: company } },
        { property: "Role", rich_text: { equals: role } },
      ],
    },
  }));
  return response.results.length > 0 ? response.results[0].id : null;
}

// Append a timestamped note to the page body
async function appendNote(pageId, message) {
  const timestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  await withRetry(() => notion.blocks.children.append({
    block_id: pageId,
    children: [{
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: `📬 ${timestamp} — ${message}` } }],
      },
    }],
  }));
}

async function updateJobEntry(pageId, data) {
  await withRetry(() => notion.pages.update({
    page_id: pageId,
    properties: {
      "Last Contacted": { date: { start: new Date().toISOString() } },
      Score: { number: data.score ?? 0 },
      Priority: { select: { name: data.priority || "Low" } },
      "Follow Up Date": { date: { start: data.followUpDate } },
      Source: { select: { name: data.source || "Gmail" } },
      ...(data.salary && {
        Salary: { rich_text: [{ text: { content: data.salary } }] },
      }),
    },
  }));
  if (data.note) await appendNote(pageId, data.note);
}

async function updateStatus(pageId, status) {
  return await withRetry(() => notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
      "Last Contacted": { date: { start: new Date().toISOString() } },
    },
  }));
}

async function createJobEntry(data) {
  if (!data.company || !data.role) {
    console.log("⚠️ Skipping incomplete data:", data);
    return;
  }
  return await withRetry(() => notion.pages.create({
    parent: { database_id: process.env.DATABASE_ID },
    properties: {
      Company: { title: [{ text: { content: data.company } }] },
      Role: { rich_text: [{ text: { content: data.role } }] },
      Status: { select: { name: data.status || "New" } },
      Source: { select: { name: data.source || "Gmail" } },
      "Last Contacted": { date: { start: new Date().toISOString() } },
      Score: { number: data.score ?? 0 },
      Priority: { select: { name: data.priority || "Low" } },
      "Follow Up Date": { date: { start: data.followUpDate } },
      ...(data.salary && {
        Salary: { rich_text: [{ text: { content: data.salary } }] },
      }),
    },
    children: data.summary
      ? [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: data.summary } }] } }]
      : [],
  }));
}

module.exports = { createJobEntry, findExistingJob, updateJobEntry, updateStatus, appendNote };
