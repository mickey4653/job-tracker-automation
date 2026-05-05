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

SALARY RULES:
- Extract salary or rate if mentioned (e.g. "$120k", "$60/hr")
- If not mentioned → return ""

SUMMARY RULES:
- Write 1-2 sentences max describing what this job opportunity is about
- Include role, company, location, and salary if available
- Keep it factual, no fluff

JOB EMAIL DETECTION:
- Set "isJobEmail" to true for:
  - Job opportunity or recruiter outreach emails
  - Application status updates (e.g. "update on your application", "your application status", "we reviewed your application")
  - Interview invitations or scheduling emails
  - Offer letters
- Set "isJobEmail" to false for:
  - Account notifications (GitHub OAuth, password resets)
  - Marketing emails, newsletters, career advice content
  - Scholarship or internship program announcements
  - Any email with no connection to a specific job or employer

- For application status emails: extract the company name, set role to "" if unknown, set "applicationUpdate" to true
- For all other job emails: set "applicationUpdate" to false

Return JSON only, no markdown, no explanation:
{
  "isJobEmail": true,
  "applicationUpdate": false,
  "company": "",
  "role": "",
  "location": "",
  "seniority": "",
  "salary": "",
  "summary": ""
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