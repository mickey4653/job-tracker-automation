// test.js
require("dotenv").config();
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function testConnection() {
  try {
    const response = await notion.databases.retrieve({
      database_id: process.env.DATABASE_ID,
    });

    console.log("✅ Connected to database:", response.title[0].plain_text);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}
testConnection();

async function createTestEntry() {
  await notion.pages.create({
    parent: { database_id: process.env.DATABASE_ID },
    properties: {
      Company: {
        title: [{ text: { content: "Test Company" } }],
      },
      Role: {
        rich_text: [{ text: { content: "Software Engineer" } }],
      },
      Status: {
        select: { name: "Applied" },
      },
    },
  });

  console.log("✅ Test entry created!");
}

createTestEntry();
