# News-Curator

## Diwata News Control

This Google Apps Script web app curates recent stories from direct NPR, PBS NewsHour, and BBC News RSS feeds. It has desks for midterm elections, Congress, courts, the economy, immigration, Trump, foreign policy, and health/science. Generate a brief, review or edit it, then send it to Google Chat.

### Configure

1. Open the project in the Apps Script editor.
2. In **Project Settings > Script Properties**, add:
	- `GEMINI_API_KEY_1` - required Gemini API key.
	- `GEMINI_API_KEY_2` - optional fallback Gemini API key.
	- `CHAT_WEBHOOK_URL` - Google Chat incoming webhook URL.
	- `NEWS_APPROVER_EMAILS` - comma-separated Google Workspace email addresses allowed to use the app.
	- `AUDIT_SPREADSHEET_ID` - ID of a dedicated Google Sheet for the audit log.
	- `APPROVED_SOURCE_DOMAINS` - optional comma-separated domain allowlist; defaults to the configured publishers (`npr.org, pbs.org, bbc.com, bbc.co.uk`).
	- `DAILY_SEND_LIMIT` - optional whole number from 1 to 100; defaults to 20.
	- `AUTOMATIC_CURATOR_ID` - optional curator ID for the existing scheduled trigger; defaults to `trump`.
3. Create a dedicated audit spreadsheet. Restrict it to administrators, copy its ID from its URL, and set `AUDIT_SPREADSHEET_ID`. The app creates a `News Audit Log` tab when first used.
4. Save the project and deploy it as a **Web app**.
5. Set **Execute as** to your account and restrict **Who has access** to users in your Google Workspace organization. The web-app approver check relies on Apps Script identifying same-domain users; unrecognized users are denied.
6. Open the deployed web app URL.

Keep the existing time-driven `sendUSAndTrumpNews` trigger enabled. Its owner must be included in `NEWS_APPROVER_EMAILS`; it continues to generate and send automatically, and its sends are audited and subject to the same source, duplicate, and daily-limit checks. Set `AUTOMATIC_CURATOR_ID` to `midterms`, `congress`, `courts`, `economy`, `immigration`, `trump`, `foreign`, or `health` to choose its desk. If the trigger is missing, open **Triggers** (clock icon) in Apps Script and create a time-driven trigger for `sendUSAndTrumpNews`.

The app only passes articles published in the previous 24 hours from the configured publisher feeds to Gemini. Its eight coverage desks have distinct, date-stamped message headlines. Article-ID citations are resolved server-side to canonical links from approved publisher domains. The brief labels one-publisher items `SINGLE-SOURCE` and multi-publisher items `MULTI-SOURCE`; AI-selected corroboration is an editorial aid, not independent fact verification. Check source links and claims before delivery.

### Operational notes

- Apps Script may request permission to fetch RSS feeds, call Gemini, access the configured webhook, and write to the audit spreadsheet on first use.
- Delivery requires an approver email match, a valid publisher link, and the audit spreadsheet. Sends use the configured daily limit (20 by default), and an identical brief cannot be sent twice within 10 minutes.
- The automatic trigger uses the trigger owner authorization rather than the browser approver check.
- Keep API keys and webhook URLs in Script Properties, never in `code.gs` or `Index.html`.

### Further improvements to consider

- Add a second human approval for high-impact or election-day briefs, with an edit history for approved copy.
- Expand election coverage with official state election offices and primary records, after validating each feed and source domain.
- Add email or Chat alerts when a feed is stale, a publisher changes its RSS format, or a daily delivery limit is near.
- Add a repeatable Apps Script test suite for RSS variants, time-window boundaries, source validation, access checks, and delivery failures.
