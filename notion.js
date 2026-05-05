// notion.js
require("dotenv").config();
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function jobExists(company, role) {
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

  return response.results.length > 0;
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
        select: { name: data.status || "Applied" },
      },
      Source: {
        select: { name: data.source || "Email" },
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
    },
  });
}

module.exports = { createJobEntry, jobExists };