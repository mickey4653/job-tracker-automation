# 🧠 Job Tracker Automation

An intelligent job opportunity pipeline that reads your Gmail, extracts structured job data using AI, scores each opportunity, and logs everything to a Notion dashboard — automatically.

---

## What It Does

1. **Connects to Gmail** via OAuth and fetches up to 50 recent emails matching job-related keywords
2. **Detects email type** — distinguishes job opportunities, application updates, and non-job emails
3. **Parses each email with GPT-4o-mini** to extract company, role, location, seniority, salary, and a summary
4. **Normalizes** messy AI output (e.g. "100% Remote" → "Remote")
5. **Validates** the result — blocks garbage like "Unknown Role" or missing company
6. **Deduplicates** — skips jobs already seen in the current run or already in Notion
7. **Scores** each job based on seniority, company, and location signals
8. **Assigns priority** (High / Medium / Low) and a 3-day follow-up date
9. **Tags source** — job board emails (Indeed, LinkedIn, Handshake, etc.) are tagged with the board name so you can check them manually
10. **Sends everything to Notion** — all fields populated, AI summary written to the page body
11. **Handles application updates** — when a company emails you an update, it appends a timestamped note to the Notion page body and refreshes Last Contacted
12. **Sends a weekly summary email** every Sunday with top scored jobs, high priority count, and follow-up reminders

---

## Pipeline Flow

```
Gmail → AI Parse → Normalize → Validate → Dedupe → Score → Notion
```

For application update emails:
```
Gmail → AI Parse → Find Existing Entry → Append Note to Page Body
```

---

## Project Structure

```
job-tracker-automation/
├── runPipeline.js      # Main entry point — orchestrates the full pipeline
├── gmailAuth.js        # Google OAuth2 authentication flow
├── gmailFetch.js       # Fetches job-related emails from Gmail (up to 50)
├── aiParser.js         # GPT-4o-mini prompt + structured extraction
├── scorer.js           # Job scoring logic (seniority, company, location)
├── notion.js           # Notion API — insert, update, dedupe, append notes
├── weeklyReport.js     # Weekly summary report sent via email
├── utils.js            # Regex-based company/role extraction helpers
├── tests/              # Manual test scripts for Gmail and Notion
└── .env                # API keys (never committed)
```

---

## Notion Database Properties

Your Notion database needs these properties:

| Property | Type |
|---|---|
| Company | Title |
| Role | Text |
| Status | Select |
| Source | Select |
| Score | Number |
| Priority | Select |
| Salary | Text |
| Last Contacted | Date |
| Follow Up Date | Date |

### Status Options
`New` → `Interested` → `Applied` → `Interview` → `Offer` / `Rejected` / `Not Interested`

The pipeline sets all new entries to `New`. You update the status manually in Notion as you take action.

### Recommended Views

- **🔥 High Priority Jobs** — Filter: `Score ≥ 7`, Sort: Score descending
- **⏳ Needs Follow-up** — Filter: `Follow Up Date` within next 5 days + `Status = Applied`
- **📋 All Jobs Pipeline** — Group by: `Status`

### Page Body
When you open any entry in Notion, the page body contains:
- AI-generated summary of the job opportunity
- Timestamped notes for any application update emails received (e.g. `📬 May 5, 2026 — An update on your application`)

---

## Scoring System

Jobs are scored automatically based on signals in the parsed data:

| Signal | Points |
|---|---|
| "senior" in title | +3 |
| "lead" in title | +4 |
| "principal" in title | +5 |
| "staff" in title | +4 |
| "junior" in title | -1 |
| Remote location | +2 |
| Lockheed in company | +5 |
| Pyramid in company | +2 |

Priority is assigned from score:
- **High** → score ≥ 8
- **Medium** → score ≥ 5
- **Low** → everything else

A `🚨 HIGH PRIORITY JOB DETECTED` alert is logged to the console when score ≥ 8.

---

## Source Tagging

Emails from job boards are automatically tagged with the board name as the `Source`:

- Emails from recruiters/employers → `Source: Gmail`
- Emails from Indeed → `Source: Indeed`
- Emails from Handshake → `Source: Handshake`
- Emails from LinkedIn → `Source: LinkedIn`
- etc.

Filter by `Source` in Notion to quickly find job board leads to check manually.

---

## GitHub Actions

### Daily Pipeline (`job-pipeline.yml`)
Runs every day at 8:00 AM UTC. Fetches emails, parses, scores, and syncs to Notion.

### Weekly Report (`weekly-report.yml`)
Runs every Sunday at 9:00 AM UTC. Queries Notion for the past 7 days and sends an email summary.

Both workflows support manual trigger via `workflow_dispatch` in the GitHub Actions tab.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a `.env` file

```env
NOTION_API_KEY=your_notion_integration_token
DATABASE_ID=your_notion_database_id
OPENAI_API_KEY=your_openai_api_key
REPORT_EMAIL_FROM=your_gmail@gmail.com
REPORT_EMAIL_PASSWORD=your_gmail_app_password
REPORT_EMAIL_TO=your_gmail@gmail.com
```

### 3. Add Google OAuth credentials

- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create a project and enable the **Gmail API**
- Create OAuth 2.0 credentials (Desktop app)
- Download and save as `credentials.json` in the project root
- Add your Gmail account as a **test user** under OAuth consent screen
- Or publish the app to avoid the 7-day token expiry

### 4. Authenticate Gmail (first run only)

```bash
node tests/gmailAuthTest.js
```

Follow the URL printed in the terminal, authorize the app, and paste the code back. A `token.json` file will be saved for future runs.

### 5. Run the pipeline

```bash
npm run pipeline
```

---

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `GMAIL_CREDENTIALS` | base64-encoded `credentials.json` |
| `GMAIL_TOKEN` | base64-encoded `token.json` |
| `NOTION_API_KEY` | Your Notion integration secret |
| `DATABASE_ID` | The ID of your Notion jobs database |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `REPORT_EMAIL_FROM` | Gmail address to send the weekly report from |
| `REPORT_EMAIL_PASSWORD` | Gmail App Password (not your regular password) |
| `REPORT_EMAIL_TO` | Email address to receive the weekly report |

Encode credential files for GitHub secrets:
```bash
base64 -w 0 credentials.json
base64 -w 0 token.json
```

---

## Security Notes

- `.env`, `credentials.json`, and `token.json` are all in `.gitignore` and will never be committed
- Never share or expose these files — they contain your API keys and OAuth tokens
- Use Gmail App Passwords for SMTP — never your regular Gmail password
