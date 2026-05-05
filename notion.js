// notion.js
require("dotenv").config();
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Returns the existing page ID if found, otherwise null
async function findExistingJob(company, role) {
  const response = await notion.databases.query({
    database_id: process.env.DATABASE_ID,
    filter: {
      and: [
        {
          property: "Company",
          title: { equals: company },
        },
        {
          property: "Role",
          rich_text: { equals: role },
        },
      ],
    },
  });

  return response.results.length > 0 ? response.results[0].id : null;
}

// Append a timestamped note to the page body
async function appendNote(pageId, message) {
  const timestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: `📬 ${timestamp} — ${message}` },
            },
          ],
        },
      },
    ],
  });
}

// Update existing entry with latest data
async function updateJobEntry(pageId, data) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "Last Contacted": {
        date: { start: new Date().toISOString() },
      },
      Score: {
        number: data.score ?? 0,
      },
      Priority: {
        select: { name: data.priority || "Low" },
      },
      "Follow Up Date": {
        date: { start: data.followUpDate },
      },
      Source: {
        select: { name: data.source || "Gmail" },
      },
      ...(data.salary && {
        Salary: {
          rich_text: [{ text: { content: data.salary } }],
        },
      }),
    },
  });

  // Append note to page body if provided
  if (data.note) {
    await appendNote(pageId, data.note);
  }
}

async function updateStatus(pageId, status) {
  return await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: {
        select: { name: status },
      },
      "Last Contacted": {
        date: { start: new Date().toISOString() },
      },
    },
  });
}

async function createJobEntry(data) {
  if (!data.company || !data.role) {
    console.log("⚠️ Skipping incomplete data:", data);
    return;
  }

  return await notion.pages.create({
    parent: { database_id: process.env.DATABASE_ID },
    properties: {
      Company: {
        title: [{ text: { content: data.company } }],
      },
      Role: {
        rich_text: [{ text: { content: data.role } }],
      },
      Status: {
        select: { name: data.status || "New" },
      },
      Source: {
        select: { name: data.source || "Gmail" },
      },
      "Last Contacted": {
        date: { start: new Date().toISOString() },
      },
      Score: {
        number: data.score ?? 0,
      },
      Priority: {
        select: { name: data.priority || "Low" },
      },
      "Follow Up Date": {
        date: { start: data.followUpDate },
      },
      ...(data.salary && {
        Salary: {
          rich_text: [{ text: { content: data.salary } }],
        },
      }),
    },
    // Page body — AI summary visible when you open the entry
    children: data.summary
      ? [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: data.summary } }],
            },
          },
        ]
      : [],
  });
}

module.exports = { createJobEntry, findExistingJob, updateJobEntry, updateStatus, appendNote };
