# Sequences and weekly cadence

## Weekly operating targets

Aim for this every week (log actuals in the **WeeklyCadence** tab):

| Metric | Target |
|--------|--------|
| Target companies added | 15 |
| Founder / CEO / COO messages | 20 |
| VP Customer / Head of Support messages | 10 |
| Recruiter conversations | 5 |
| Informational calls | 3 |
| Executive interview | 1 |

Objective: a **predictable pipeline**, not waiting for openings.

## Outreach sequence (per contact)

| Day | Step ID | Action |
|-----|---------|--------|
| 1 | `D1_initial` | Initial outreach — business conversation (see [playbook.md](playbook.md)) |
| 7 | `D7_insight` | Share a relevant insight tailored to their stage or product |
| 21 | `D21_observation` | Share an article, observation, or short pattern you’ve seen |
| 45 | `D45_milestone` | Check in with a company milestone, congratulations, or new useful note |

### Follow-up rules

- Stay useful. Do **not** ask whether they’ve seen your message.
- Personalized, value-focused follow-ups beat “just bumping this.”
- If they reply, move company status to `Conversation` (or `Interview`) and stop the automated cadence — work the relationship.
- If no reply after D45, move to `Nurture` and revisit only when there is a new public signal (funding, hire, expansion).

### Example Day 7 (insight)

```
Hi Sarah — quick follow-up with one pattern that may be useful as you scale.

When support headcount grows faster than tooling and QA ownership, CSAT often holds while cost-per-contact and handle time quietly erode. The fix is usually operating rhythm (QA, BPO SLAs, deflection owners) before another headcount wave.

Happy to share a simple scorecard if useful — no pitch.
— Yahor
```

### Example Day 21 (observation)

```
Hi Sarah — saw [public signal: funding / market / product launch]. Congrats.

One observation from subscription brands at similar stage: contact rate often jumps before leadership feels it in the P&L, especially after catalog or geo expansion. Early localization + deflection design usually pays for itself within a quarter.

If you're already deep on this, ignore — otherwise glad to compare notes.
— Yahor
```

### Example Day 45 (milestone)

```
Hi Sarah — following your [milestone]. Impressive pace.

Still happy to exchange notes on customer ops scaling whenever useful. No agenda beyond being a useful peer conversation.
— Yahor
```

## Weekly operating loop

1. **Add** up to 15 companies (fill Dream 100 tiers toward 25 each).
2. **Research** → set status `Ready` when contact + hook exist.
3. **Send** D1 messages (CEO/COO and VP CX mix per targets).
4. **Log** every touch in `Interactions`; update `LastContact` / `NextFollowUp` on `Companies`.
5. **Work due follow-ups** (filter `NextFollowUp` ≤ today).
6. **Book / take** informational calls; advance statuses.
7. **Publish** one LinkedIn post (see [content-calendar.md](content-calendar.md)); log in `Content`.
8. **Fill WeeklyCadence** actuals for the week.

## Warm introductions (30% of mix)

Track on `Companies.WarmIntroPath`:

- Who can introduce you (investor, advisor, ex-colleague)
- Ask status (`NotAsked` / `Asked` / `IntroMade`)
- Prefer intro before cold outreach when a path exists
