# Google Sheets schema

Import CSVs from [`templates/`](templates/) into a **private** spreadsheet. Live company, contact, and email data stay in Sheets only — do not commit real rows to git.

## Tabs

| Tab name | CSV | Purpose |
|----------|-----|---------|
| `Companies` | [companies.csv](templates/companies.csv) | Dream 100 pipeline |
| `Contacts` | [contacts.csv](templates/contacts.csv) | Best person per company |
| `Interactions` | [interactions.csv](templates/interactions.csv) | Every touch logged |
| `WeeklyCadence` | [weekly-cadence.csv](templates/weekly-cadence.csv) | Weekly targets vs actuals |
| `Content` | [content-posts.csv](templates/content-posts.csv) | LinkedIn backlog |
| `Dashboard` | _(create empty)_ | COUNTIF summary formulas below |

Delete the anonymized example row after import if you prefer a blank start.

---

## Companies

| Column | Required | Allowed values / notes |
|--------|----------|------------------------|
| `CompanyID` | yes | Stable id, e.g. `C001` |
| `CompanyName` | yes | Legal or common name |
| `Tier` | yes | `1` Absolute dream · `2` Fast-growing AI · `3` High-growth SaaS · `4` Nutrition / wellness / subscription commerce |
| `SizeBand` | yes | `Under300` · `Over300` |
| `ApproxEmployees` | no | Number if known |
| `Industry` | no | Free text |
| `CustomerModel` | no | e.g. SaaS, subscription commerce, marketplace |
| `GrowthStage` | no | e.g. Seed, Series A–D, Growth, Public |
| `LastFundingRound` | no | Round + date if known |
| `HiringActivity` | no | Notes on CX / Support / Ops / leadership hiring |
| `PrimaryContactRole` | yes | Target title band (CEO, COO, CCO, VP CX, …) |
| `Status` | yes | See pipeline statuses |
| `LastContact` | no | `YYYY-MM-DD` |
| `NextFollowUp` | no | `YYYY-MM-DD` — sequence day |
| `WarmIntroPath` | no | Who can intro you |
| `WarmIntroStatus` | no | `NotAsked` · `Asked` · `IntroMade` · `None` |
| `ClosedReason` | no | When `Status` = `Closed` |
| `Notes` | no | Research hooks, insights |
| `Website` | no | URL |
| `LinkedInCompany` | no | Company LinkedIn URL |

### Pipeline statuses

`Research` → `Ready` → `Outreach` → `Follow-up` → `Conversation` → `Interview` → `Nurture` → `Closed`

### Tiers (Dream 100)

Aim for **25 companies per tier** (100 total).

| Tier | Definition |
|------|------------|
| 1 | Absolute dream companies |
| 2 | Fast-growing AI startups |
| 3 | High-growth SaaS |
| 4 | Nutrition, wellness, and subscription commerce |

---

## Contacts

| Column | Required | Notes |
|--------|----------|-------|
| `ContactID` | yes | e.g. `P001` |
| `CompanyID` | yes | Match `Companies.CompanyID` |
| `FullName` | yes | |
| `Title` | yes | |
| `LinkedInURL` | no | Profile URL |
| `Email` | no | Manual entry only |
| `EmailStatus` | no | `Unknown` · `Unverified` · `Verified` · `Bad` |
| `PreferredChannel` | no | `LinkedIn` · `Email` · `Intro` · `Other` |
| `IsPrimary` | yes | `TRUE` / `FALSE` — one primary per company preferred |
| `Notes` | no | |

Contact rules by size: see [playbook.md](playbook.md). Avoid generic recruiting inboxes initially.

---

## Interactions

| Column | Required | Notes |
|--------|----------|-------|
| `InteractionID` | yes | e.g. `I001` |
| `Date` | yes | `YYYY-MM-DD` |
| `CompanyID` | yes | |
| `ContactID` | yes | |
| `Channel` | yes | `LinkedIn` · `Email` · `Call` · `Intro` · `Other` |
| `SequenceStep` | yes | `D1_initial` · `D7_insight` · `D21_observation` · `D45_milestone` · `AdHoc` · `Reply` |
| `Outcome` | no | `Sent` · `Replied` · `MeetingBooked` · `NoReply` · `Bounced` · `Other` |
| `NextAction` | no | Free text |
| `NextActionDate` | no | `YYYY-MM-DD` — copy to `Companies.NextFollowUp` when relevant |
| `Notes` | no | Snippet of what you sent / learned |

---

## WeeklyCadence

One row per ISO week.

| Column | Notes |
|--------|-------|
| `WeekStart` | Monday `YYYY-MM-DD` |
| `CompaniesAdded` / `CompaniesAddedTarget` | Target default **15** |
| `FounderCeoCooMessages` / `FounderCeoCooMessagesTarget` | Target default **20** |
| `VpCxSupportMessages` / `VpCxSupportMessagesTarget` | Target default **10** |
| `RecruiterConversations` / `RecruiterConversationsTarget` | Target default **5** |
| `InformationalCalls` / `InformationalCallsTarget` | Target default **3** |
| `ExecutiveInterviews` / `ExecutiveInterviewsTarget` | Target default **1** |
| `LinkedInPostPublished` | `TRUE` / `FALSE` |
| `Notes` | |

### Attainment formulas (row 2 example)

Assume headers in row 1 and data starting row 2. In columns after the targets (or a side block):

```
=IF(B2=0,"",C2/B2)   // example: actual/target — map to your column letters after import
```

Suggested attainment columns (add after import):

| Metric | Formula pattern |
|--------|-----------------|
| Companies % | `=CompaniesAdded / CompaniesAddedTarget` |
| Founder messages % | `=FounderCeoCooMessages / FounderCeoCooMessagesTarget` |
| VP CX messages % | `=VpCxSupportMessages / VpCxSupportMessagesTarget` |
| Recruiter % | `=RecruiterConversations / RecruiterConversationsTarget` |
| Calls % | `=InformationalCalls / InformationalCallsTarget` |
| Interviews % | `=ExecutiveInterviews / ExecutiveInterviewsTarget` |

Format as **Percent**.

---

## Content

| Column | Notes |
|--------|-------|
| `PostID` | e.g. `L001` |
| `WeekStart` | Week you intend to publish |
| `TitleOrHook` | Working title |
| `Status` | `Idea` · `Drafting` · `Ready` · `Published` · `Parked` |
| `PublishedDate` | `YYYY-MM-DD` |
| `URL` | LinkedIn post URL |
| `Angle` | Short tag (hiring, AI, metrics, …) |
| `Notes` | Draft scraps / reuse for D21 |

---

## Dashboard tab (formulas)

Create an empty sheet named `Dashboard`. Paste labels in column A and formulas in column B (adjust sheet/column letters to match your import).

Assume `Companies` columns: `Tier` = C, `Status` = L (verify after import — use header row to confirm).

### By tier

```
Tier1	=COUNTIF(Companies!C:C,1)
Tier2	=COUNTIF(Companies!C:C,2)
Tier3	=COUNTIF(Companies!C:C,3)
Tier4	=COUNTIF(Companies!C:C,4)
Total	=COUNTA(Companies!A:A)-1
```

### By status

```
Research	=COUNTIF(Companies!L:L,"Research")
Ready	=COUNTIF(Companies!L:L,"Ready")
Outreach	=COUNTIF(Companies!L:L,"Outreach")
Follow-up	=COUNTIF(Companies!L:L,"Follow-up")
Conversation	=COUNTIF(Companies!L:L,"Conversation")
Interview	=COUNTIF(Companies!L:L,"Interview")
Nurture	=COUNTIF(Companies!L:L,"Nurture")
Closed	=COUNTIF(Companies!L:L,"Closed")
```

After import, freeze the header row on each tab and turn on **Filter views**.

---

## Conditional formatting (overdue follow-ups)

On **Companies**, select the `NextFollowUp` column:

1. Format → Conditional formatting
2. Rule: **Date is before** → `=TODAY()`
3. Also require Status is `Outreach` or `Follow-up` if Sheets custom formula:

```
=AND(N2<>"", N2<TODAY(), OR(L2="Outreach", L2="Follow-up"))
```

(Replace `N` / `L` with the actual `NextFollowUp` / `Status` columns.)

Highlight fill: light red or amber so due follow-ups are obvious.

---

## Data hygiene

- Keep the spreadsheet **private**; do not paste verified emails into the git repo.
- One primary contact per company when possible (`Contacts.IsPrimary` = TRUE).
- After every send or call: add an `Interactions` row and update `LastContact` + `NextFollowUp`.
- Prefer LinkedIn or warm intro before cold email when email is `Unverified`.
