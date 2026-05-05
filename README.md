# 🧠 Job Tracker Automation

An intelligent job opportunity pipeline that reads your Gmail, extracts structured job data using AI, scores each opportunity, and logs everything to a Notion dashboard automatically.

---

## What It Does

1. **Connects to Gmail** via OAuth and fetches recent emails matching job-related keywords
2. **Parses each email with GPT-4o-mini** to extract company, role, location, and seniority
3. **Normalizes** messy AI output (e.g. "100% Remote" → "Remote")
4. **Validates** the result — blocks garbage like "Job Opportunity" or "Unknown Role"
5. **Deduplicates** — skips jobs already seen in the current run or already in Notion
6. **Scores** each job based on seniority, company, and location signals
7. **Assigns priority** (High / Medium / Low) and a 3-day follow-up date
8. **Sends everything to Notion** — company, role, score, priority, status, and follow-up date

---

## Project Structure

```
job-tracker-automation/
├── runPipeline.js      # Main entry point — orchestrates the full pipeline
├── gmailAuth.js        # Google OAuth2 authentication flow
├── gmailFetch.js       # Fetches job-related emails from Gmail
├── aiParser.js         # GPT-4o-mini prompt + structured extraction
├── scorer.js           # Job scoring logic (seniority, company, location)
├── notion.js           # Notion API — insert entries + duplicate check
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
| Priority | Select (High, Medium, Low) |
| Last Contacted | Date |
| Follow Up Date | Date |

### Recommended Views

- **🔥 High Priority Jobs** — Filter: `Score ≥ 7`, Sort: Score descending
- **⏳ Needs Follow-up** — Filter: `Follow Up Date` within next 5 days + `Status = Applied`
- **📋 All Jobs Pipeline** — Group by: `Status`

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
```

### 3. Add Google OAuth credentials

- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create a project and enable the **Gmail API**
- Create OAuth 2.0 credentials (Desktop app)
- Download and save as `credentials.json` in the project root
- Add your Gmail account as a **test user** under OAuth consent screen

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

## Environment Variables

| Variable | Description |
|---|---|
| `NOTION_API_KEY` | Your Notion integration secret |
| `DATABASE_ID` | The ID of your Notion jobs database |
| `OPENAI_API_KEY` | Your OpenAI API key |

---

## Security Notes

- `.env`, `credentials.json`, and `token.json` are all in `.gitignore` and will never be committed
- Never share or expose these files — they contain your API keys and OAuth tokens

---

## Coming Soon

- GitHub Actions for automated scheduled runs
- Email / Discord / Slack alerts for high-priority jobs
- Follow-up reminder notifications
