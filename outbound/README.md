# Executive outbound system

Ops playbook + Google Sheets CRM for Yahor's executive pipeline. **Not** part of the public site — no Astro routes serve this folder.

You are selling capability: building a world-class customer organization before it becomes a bottleneck. The Sheet is the CRM; this folder is the operating manual.

## Quick links

| Doc | Purpose |
|-----|---------|
| [playbook.md](playbook.md) | Positioning, who to contact, message rules |
| [sequences.md](sequences.md) | Day 1/7/21/45 + weekly targets + operating loop |
| [content-calendar.md](content-calendar.md) | Weekly LinkedIn posts |
| [SCHEMA.md](SCHEMA.md) | Column definitions, statuses, formulas |
| [templates/](templates/) | CSV imports for Sheets |

## One-time Google Sheets setup

1. Create a **private** Google Spreadsheet (e.g. `Yahor — Executive Outbound CRM`).
2. For each CSV in `templates/`:
   - File → Import → Upload
   - Import location: **Insert new sheet(s)**
   - Separator: comma
   - Rename the tab to match SCHEMA (`Companies`, `Contacts`, `Interactions`, `WeeklyCadence`, `Content`)
3. Delete the anonymized example data row on each tab (keep the header), or keep it as a format reference.
4. Create an empty tab named `Dashboard` and paste the COUNTIF block from [SCHEMA.md](SCHEMA.md).
5. Freeze row 1 on every tab; enable filters.
6. Apply **conditional formatting** on `Companies!NextFollowUp` for overdue dates (rules in SCHEMA).
7. Optional: add attainment % columns on `WeeklyCadence` using the formulas in SCHEMA.

No Google API, Apps Script, or repo secrets required for v1.

## Weekly workflow

Follow [sequences.md](sequences.md):

1. Add companies (target 15) across Dream 100 tiers.
2. Research → `Ready` when you have a contact + hook.
3. Send outreach (founder/CEO/COO and VP CX mix).
4. Log touches in `Interactions`; update `LastContact` / `NextFollowUp`.
5. Work due follow-ups; advance pipeline status.
6. Publish one LinkedIn post; log in `Content`.
7. Fill `WeeklyCadence` actuals.

## Channel mix reminder

- 40% proactive outreach  
- 30% warm introductions  
- 20% exceptional public applications  
- 10% content  

## Out of scope (v1)

- Public site copy changes
- Seeding real Dream 100 rows or email verification APIs
- Sheets API sync / Apollo / Hunter automation
- Job-application tracker tab (add later if needed)

## Privacy

Do not commit real emails, phone numbers, or conversation notes to git. Templates may contain **anonymized** example rows only. Live CRM data lives in your private Sheet.
