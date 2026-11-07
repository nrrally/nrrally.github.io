# Data entry guide

How to get a round's official results into the site correctly, without help from AI or a developer. Read it once before the first event of a season.

## Principles

1. **Official classification PDFs only.** Use the final classification published on the event's results page or its noticeboard. Never use live timing.
2. **Enter exactly what is printed.** Don't correct the sheet. Where the championship treats something differently from the sheet, record that as an *override* with a reason (see "Judgement calls" below).
3. **Nothing goes live until you publish,** and every publish can be undone (History → Undo).

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

## Before each season: a 15-minute rehearsal

1. Go to the admin's sign-in page → **Practise in demo mode**. Nothing is saved.
2. Import the first official PDF of the new season into any round.
3. **If the importer refuses the text, the PDF layout has changed.** Use the spreadsheet template for now. A developer can add the new layout to `parseClassificationText`: add the copied text to the test kit's `fixtures/`, extend the importer, and run `node test-kit/run-all.js`.
4. Check the class list and points scales under Season settings for the new SSRs.
