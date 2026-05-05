const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function parseJobWithAI(email) {
  const prompt = `
Extract structured job data from this email.

COMPANY RULES:
- MUST be the real employer (not recruiter, not email provider, not sender name)
- If a staffing agency is mentioned alongside a client company, use the client company
- If only a recruiter/agency is mentioned, use that as company

ROLE EXTRACTION RULES (VERY IMPORTANT):
- NEVER output "Unknown Role"
- MUST always return a real job title or the closest possible role
- If role is unclear, infer aggressively from subject, company, or email intent
- For recruiter-style or vague subjects like:
    "Job Opportunity Through Ascendion :: 100% Remote Role"
    → infer role from context (e.g. "Software Engineer", "Engineering Role")
- NEVER return marketing phrases like:
    "Job Opportunity", "Hiring Now", "Opportunity", "Remote Role", "Career"
- If truly no role can be inferred → return "Software Engineer" as safe default

LOCATION RULES:
- Clean format only: "City, State" or "Remote"
- Normalize "100% Remote", "Remote role", "Fully Remote" → "Remote"

Return JSON only, no markdown, no explanation:
{
  "company": "",
  "role": "",
  "location": "",
  "seniority": ""
}

EMAIL:
Subject: ${email.subject}
From: ${email.from}
Body:
${email.body || "(no body)"}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You extract structured job data." },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { parseJobWithAI };