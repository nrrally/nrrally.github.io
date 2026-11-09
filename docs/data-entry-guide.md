# Data entry guide

How to get a season or round's official data into the site correctly. Manual entry, deterministic PDF/spreadsheet import and optional AI preparation are all available.

## AI Import (free ChatGPT or Claude)

AI Import prepares data; it cannot publish. Free chat accounts do not provide supported free API access, so there are no provider keys, automatic uploads or paid backend. You choose your AI service and attach the documents there. No prompt guarantees correctness.

1. Open **AI Import** and choose **New season**, **Update season / regulations**, **Entry-list crews & participation** or **Official round results**. Choose the year and, for results, the round.
2. List the official document filenames, kinds, dates/versions and URLs. Start with the SSRs, applicable SRs and amendments. For results use the actual official classification, not live timing or an entry list. Download Sportity documents if the AI cannot read a login-only link.
3. Generate the prompt pack. Copy the prompt or download it and the exact JSON contract. Upload documents yourself in a free ChatGPT or Claude chat. Existing name/alias context is **off by default**; include it only if sharing those names with your chosen service is appropriate. Never attach a database backup, licence/contact details, biographies or photos.
4. Use staged, complete setup/entry batches: regulations first, then an Update season pack for calendar/classes, then an Entry-list pack for crew participation. Results require **one whole classification** per pack, not a page at a time. Coverage must declare one combined batch, every source page exactly once, total document pages and whole-classification row/status totals. If the AI processes pages separately, combine all batches for the same source and target into one response before staging. **Per-page imports replace rather than append**, and partial/missing/duplicate batches or pages are blocked. Partial returned text remains local and can be downloaded for later repair; this release does not accumulate pages in the site. Free upload/context quotas vary. A missing or unreadable governing document is a blocker; request it instead of guessing.
5. Paste the returned JSON or choose its file and select **Read returned JSON**. Markdown fences, incomplete JSON, unsupported rules, missing evidence, incomplete coverage and invalid rows are rejected before any working data changes. Use **Generate repair / developer handoff prompt** to request a corrected response or document unsupported rules.
6. Review source pages/clauses, row/status counts, all unclear stage times and each proposed exception. Paged identity review matches unique exact names automatically; fuzzy matches and alias suggestions require your decision. Search for another existing profile instead of creating a duplicate. Printed names stay as supplied, while aliases resolve stable profiles. Duplicate resolved crew members or scored credits in the same round, including extra starts, block the AI import. Evidence-backed driver/co-driver swaps remain possible for distinct people.
7. Approve the rules against the regulations and the source/exception review, then **Calculate change preview**. Inspect added/changed documents, removed result rows and before/after driver/co-driver starts, points and ranks. Stage the reviewed task only after it is correct.
8. Use **Review & publish** normally. Nothing automatically changes the public default season; set that separately under Season settings.

AI classifications whose printed status is provisional or not clearly final show a warning and require a separate acknowledgment before staging. Acknowledgment does not make the data final: the printed status is preserved. Normal manual/provisional editing remains available.

Entry lists bulk-add profiles **and scoped crew participation** through the same identity-review workflow.
Include `entryLists` in the returned competitor pack, with the event ID from the prompt, supported NR
crew rows, printed entry class, provenance, explicit day selections and complete reconciled coverage.
A legacy pack without `entryLists` still adds profiles, but warns that it does **not** record participation.
Entry lists never create starts, points, result rows or season-wide class overrides. AI cannot invent
confirmations against MSA standings or bypass a total mismatch. Existing evidence-backed row overrides
survive replacement only for the same car **and resolved crew**, not a reused car number.

For a small manual entry note, use **Events & calendar → Note an official entry list** (or expand existing
**Entry evidence**). Record source URL, file/title, date and coverage/exclusions; add only supported
Northern Regions crews. Select source coverage and each crew's days independently. Leave crew days empty
for event-only evidence. Explicit NRC "Both days"/"Day 1 only"/"Day 2 only" regional selections are day
evidence when the dates/format agree; an undifferentiated weekend list is not. Missing sources mean
unknown coverage. Do not mark absent classified crews DNS: keep **Entered (start unknown)** unless an
official source explicitly says DNS or withdrawal, and cite that status separately.

Preserve entry crew names even when classifications use a substitute or a changed car number. Resolve
verified alternate spellings in **Competitors**, not by guessing identities from car number. Unresolved entry names are never auto-added on publish,
even if also printed in results. The **Competitors** and **Review & publish** panels let you explicitly
match a verified alias to an existing profile or **Add as new competitor** after checking for duplicates.
Classification-only names retain the legacy auto-add behavior. Concurrent changes recheck entry identities.
Review the identity evidence, stored event list before/after and classification starts/points before publishing. Reimport replaces
only the selected complete event list, so inspect removed entries; unrelated lists and classification
evidence remain intact. Entries appear unobtrusively below a round classification, on calendar event cards
and in crew/profile documented-event counts, not in a new DNS section.
Upcoming calendar rounds also show a quiet documented entry count when day scope is established,
with partial/unknown coverage wording; missing coverage is never shown as zero or inferred DNS.

Coordinated public/admin/privacy/disclaimer scripts carry the same asset version (see
[releases.md](releases.md)). The entry-aware public UI tolerates
an old engine by omitting unsupported entry displays. The new admin refuses restore/publish if the
entry-aware engine/import contract is missing and asks for **Ctrl+Shift+R**. Deploy HTML and scripts
together and retire old open admin tabs before backfill; an already-loaded old admin cannot be made safe
by new JavaScript it has not loaded. Bump coordinated asset versions together when that contract changes.
Backup restore compares saved crew/source evidence and round scopes, not only list sizes; review its
additional confirmation when a replacement removes evidence.

Omitted fields and unrelated data are preserved. Calendar/class/event/document updates add or update records rather than deleting absent ones; remove obsolete items deliberately through the manual editors. Repeated identical imports make no changes. Changes to existing results or scoring clear affected MSA confirmations.

Use **Download local import draft** to save/resume unfinished preparation. Keep that file private: it contains the response and a local identity/season snapshot. Resuming requires another review, and changed target data requires **Recheck against current draft**. Closing the tab loses unsaved preparation; no private documents are stored in browser storage.

Imported scoring/settings changes block publishing until reviewed again. If only values or calendar details changed and the declared policies still apply, review them under Season settings or AI Import. If the scoring policy changed, import the amended regulations. Unsupported policies need a developer change; a checkbox cannot make them supported.

The browser accepts up to 4 MiB of returned JSON, 10,000 items per array, 16,000 characters per string and 20 schema levels. These are local safety limits, not provider quotas. Use smaller complete batches. Publication remains atomic and refuses oversized documents or requests; do not work around this by partially publishing a broken season.

## Principles

1. **Official classification PDFs only.** Use the final classification published on the event's results page or its noticeboard. Never use live timing.
2. **Enter exactly what is printed.** Don't correct the sheet. Where the championship treats something differently from the sheet, record that as an *override* with a reason (see "Judgement calls" below).
3. **Sports/settings edits remain drafts until publish.** History → Undo stages document before versions for review, not full photo/config/Auth recovery. Admin-list changes save immediately outside this flow.

## How importing works (no AI involved)

The importer is plain code in `assets/engine.js` that runs in your browser. It gives the same result every time for the same input.

- **Text copied from the PDF** (`parseClassificationText`):
  - It recognises the two official layouts used in 2026: the nrcsa.co.za results system and RallyScoring.
  - Text in any other layout is **refused**, never guessed.
  - It is tested against the real 2026 sheets (see `testing.md`).
- **Spreadsheet** (`parseSpreadsheet`):
  - Reads rows typed into the downloadable template, so it works for any sheet, including scans.
  - Refuses a header row with a required column missing.
  - Reports any column it doesn't recognise.

**What protects the data is the set of checks, not the parser.** They run on every row, on import and again before publishing:

| Check | Catches |
|---|---|
| Stage times + penalty = official total, to the tenth of a second, for every classified crew | A misread or mistyped time, or a time under the wrong stage |
| Positions run 1, 2, 3… with no gaps or repeats; totals increase with position | Missing or swapped rows |
| Unique car numbers; every crew has a driver and a class; times in m:ss.s form | Incomplete rows, typing slips |
| "Stages completed" equals the number of times filled in | Missing stage times for crews that retired |
| New names, and new names that look like an existing competitor | Typos, and one person getting two profiles |

**Errors** block publishing. **Checks** (warnings) must be read, but don't block.

**One thing no check can catch:** for a crew that retired part-way, copied PDF text can't show which stage it skipped. The importer flags those cars. Compare their times with the PDF, column by column.

## Step by step

1. **Calendar.** In Events & calendar, make sure the event and its round exist. Each day with its own Northern Regions classification is a round.
2. **Get the PDF.** Download the official classification and save it in the private project archive.
3. **Import.** Go to Results → the round → Import the official results.

   **If the PDF has text and the 2026 layout:**
   1. Open it in Chrome or Edge.
   2. Press Ctrl+A, then Ctrl+C.
   3. Paste into the box and choose **Read the results**.

   **If it's a scan, a photo or a new layout:**
   1. Choose **Spreadsheet**, then **Download a template for this round**.
   2. Open the template in Excel and set all its cells to **Text** before typing. Otherwise Excel changes times such as 7:41.5.
   3. Type one row per car exactly as printed.
   4. Paste the rows back in (or choose the saved CSV file).

   You can also skip the import and type straight into the table.
4. **Read the import summary before using the rows.** It shows:
   - how many rows were found (classified, DNF and DNS);
   - whether every classified row adds up;
   - unknown columns;
   - new or look-alike names.

   Compare the counts with the PDF.
5. **Fix the round in the table:**
   - Fix every **Error**.
   - Read every **Check**.
   - For each flagged retired crew, compare its times with the PDF.
6. **Sheet details.** Fill in the title, status (e.g. "Final Official Classification"), the results page link and the PDF file name. Add any remarks printed on the sheet as round notes.
7. **Points preview.** Check that it matches your expectations, for example the class winners.
8. **Review & publish.**
   1. Read the list of changes.
   2. For each new competitor, decide whether it's a new person or another spelling of someone who already exists (see below).
   3. Publish.
9. **Check on the site.** Open the round's Classification tab and compare it with the PDF.

## Judgement calls

These are decisions a person makes. They are recorded in the data as overrides with a reason, which the site shows to visitors. `node tools/report.js <year> <backup.json>` lists all of them.

| Situation | What to do in the admin |
|---|---|
| A name is printed differently from an existing competitor, e.g. initials, a missing "Jnr", or a spelling slip | Before publishing: Competitors → that person → **Also printed as**, then add the printed spelling. If two profiles already exist, use **Merge**. |
| The championship scores a crew in a different class from the one printed on the sheet, for the whole season | Competitors → the person → **<year> class** (driver and/or co-driver) |
| The class differs for one round only | Results → the row → **More** → **Scored class** |
| The championship standings credit the result to a different driver or co-driver than the sheet (e.g. a crew printed the wrong way round) | Results → the row → **More** → **Points go to driver/co-driver**, and fill in **Why** |
| The standings don't count a co-driver start that the sheet shows | Row → **More** → **Don't count a co-driver start**, plus **Why** |
| The standings count a start for a crew that isn't on the sheet | Results → **Starts recorded by MSA but missing from the sheet** |
| The printed total really doesn't equal the stage times plus penalty | Row → **More** → **The total is printed this way on the sheet**, then explain it in the car's notes |
| MSA publishes standings that include the round | Compare points. If they match, tick **Points for this round match the published MSA standings**. If they don't, find out why before overriding anything. |

When the sheet and the official standings disagree, follow the standings and record the reason. Ask the event organisers if it's unclear.

## RallyeSport results (independent from NR)

Use **RallyeSport** in the admin for RS seasons. It is intentionally a separate event
and classification editor, not another NR class. Creating an RS event does not require
an NR calendar event or round. Record the official event name/dates, exact classification
source (HTTPS URL, source file name or description), explicit RS championship round number
when known, printed classification status/order,
printed category, stage selection, individual stage times, penalty and official total.
Keep missing values blank; do not calculate official positions or status from stage sums.
Preserve a printed `TEST` status as `TEST`, with its source order; it is neither DNS nor
DNF, earns no championship points and has no championship class table. Retain each stage
observation independently, including a later-stage time after a missing earlier stage.
An unsupported category remains visible in event results and blocks that event's scoring
unless an explicit, classification-scoped mapping to RS2/RS4 is confirmed and its
evidence recorded. The source category stays unchanged, and the mapping does not carry to
another event or season. Never map `TEST` into a scoring class.

The only available scoring profile is 2026 Rallysprint SSR V1 (9 July 2026). Select it
only for an applicable 2026 event, and record event-specific applicability, championship
round status and the evidence. User confirmation applies to the privately reviewed 2026
classification set, including a pre-issue independent event; keep event identities and
source records in the private review archive. This does not authorize applying the SSRs
to other events or years. Set
invitational status explicitly for every classified row. Event-level
invitation exclusion is not the same as the RS-season per-person **Non-Scoring RS Member**
toggle. That toggle assumes all unchecked people are paid up (not verified), excludes
only that person from RS scoring, and recalculates the driver and co-driver orders
separately. It never changes the event sheet or NR.

For SSR 7.2's five-round double-points exception, record the event's start date and the
official bulletin issue date separately as ISO dates, plus the bulletin evidence. The
engine requires the bulletin to be at least 14 days before the event; unclear or late
dates block points. Do not mark other round counts double-points without clarification.

Before entering times separately, check whether an RS event uses the same physical
stages as an NR result. If it does, associate the exact NR event/round as applicable,
select the exact RS stage subset and explicitly map each shared RS stage to its NR stage.
The **Review and copy mapped NR stage times** action requires exact matching car and
reviewed driver/co-driver profiles. It previews new values for blank RS cells, flags
conflicting existing values, and preserves missing/unmatched RS-only crews. On
confirmation it copies only reviewed printed time strings into the RS record with
provenance; cancellation or error does not mutate the draft. This is a snapshot: future
NR edits do not update it. It does not import NR class, position, DNF/DNS status, penalty
or points. Review every proposed value against the RS source.

When a printed crew name does not uniquely resolve, choose the reviewed driver and
co-driver profile IDs in that RS row and record the evidence. This preserves the printed
names while giving scoring and same-event time-copy matching stable identities. Never
infer identity or crew role from a car number alone. An NR spelling may guide an uncertain
spelling only when the exact same-event car and crew match have been reviewed; keep the
RS printed spelling as source evidence. A separate scoring-finality review is available
when the user explicitly accepts a supplied source for points. Keep the printed source
title/status/footer unchanged and record the reason; this decision does not prove that
external technical checks have cleared. Select the separate finality review before
entering its evidence; the evidence field is disabled otherwise, and editing it cannot
activate scoring finality on its own.

Event points require either source-supported finality or an evidence-backed user
finality review, the 15-starter threshold, applicable ruleset,
championship-round and invitation inputs. A started DNF earns no points but counts as a
starter when start evidence is present. A no-time DNF is not proof of a start; otherwise
record a reviewed non-TEST starter count and its evidence. `TEST` entries remain in the
event results and do not score; whether they count toward the minimum is unresolved. A
reviewed count of at least 15 non-TEST starters establishes the threshold. If fewer than
15 non-TEST starters are established and TEST rows could change whether the threshold is
met, points stay blocked.
Explicit `Final Results` wording is recognized as final without rewriting the source
status. A source note that says checks are pending is not independently treated as
cleared; only an explicit finality review can accept that source for scoring, and the UI
continues to show the source qualification. A shared overall position across classes is retained. Within each class, printed
class positions are used only when complete; otherwise official overall positions order
the whole class consistently. The app does not recompute SSR 7.5's stage-time tie-break,
so any contradictory or still-tied scoring order blocks points. Season tie-breaks and
future-year policies are not implemented.

Supported completed events can contribute to clearly labelled provisional cumulative
tables while a scheduled event or season rule remains blocked; the table identifies
included and excluded events and why. These are not final eligibility or champion
declarations. RS event tables remain available when scoring is unconfigured.

Public RS event tables are linked secondarily from Info/footer. A shared NR round graph
offers an optional dashed **Show RS overlay** only when explicit RS stage mappings exist.
It is off by default; intermediate comparisons use RS stage values and do not alter
NR calculations. RS-only events have their own classifications and tables without any
NR graph or round. RS-only leaders are not linked to NR-only profiles that cannot show
their RS history. The homepage retains NR as its default; local leader/class/result
controls expose the separate RS views. The full calendar orders dated NR and RS events
by their known dates, shows undated events explicitly, and merges shared cards only by
an explicit `nrEventId`. Browser/admin scripts use coordinated query version
`rallyesport-12`;
retire older open admin tabs before editing or publishing RS data.

## Before each season: a 15-minute rehearsal

Start with [the complete season/event lifecycle](season-lifecycle.md). A calendar-only
year needs no competitors or results. Copied settings must be verified against actual
new SSRs and supported scoring policies; the shared guide requires an independent edition
review. Do not invent surface/links/day allocation or import a fictional season into live data.

1. Sign in with an authorized admin account, then choose **Practise in simulation**. The simulation uses published data and never saves to Firebase. Return to the live admin or sign out when finished.
2. Import the first official PDF of the new season into any round.
3. **If the importer refuses the text, the PDF layout has changed.** Use the spreadsheet template for now. A developer can add the new layout to `parseClassificationText`: add the copied text to the test kit's `fixtures/`, extend the importer, and run `node test-kit/run-all.js`.
4. Check the class list and points scales under Season settings for the new SSRs.
