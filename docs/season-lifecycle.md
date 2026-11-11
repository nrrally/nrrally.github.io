# Season and event lifecycle

This is the annual operating procedure, including a calendar-only year. It is not an
announcement of a future season and does not contain new-year regulations. Use official
supplied material, not fictional test fixtures or assumptions from the previous year.
For data-entry details see [data-entry-guide.md](data-entry-guide.md); for algorithms
and unsupported policies see [scoring-rules.md](scoring-rules.md).

## Separate facts from decisions

The year, event, scoring round, entrant, starter, classified finisher, points match and
active-rally warning are independent facts. They must not be manufactured from each other.

| Evidence supplied | Safe action | Not established |
|---|---|---|
| Official calendar with dates and locations | Enter only those named events and supplied calendar facts | Surface, links, day allocation, planned stages, entries or results |
| Calendar names a two-day event but no regional round allocations | Keep the event's supplied date text; leave round/day allocation unresolved | Two NR rounds merely because there are two days |
| Official new-year SSRs | Review edition/amendments, supported policy, classes, scales and eligibility threshold | Automatic approval of copied settings or guide copy |
| Official entry list | Record evidenced NR crews and scopes, provenance and explicit coverage | Starts, points, classMap or DNS inferred from absence |
| Official classification | Store printed fields, status and source; calculate supported site points | Official championship confirmation or a live timing stream |
| MSA championship standings | Compare every represented driver's/co-driver's points and explain discrepancies | Permission to tick all rounds or silently correct printed sheets |
| Date arrives/passes | Show scheduled-today/awaiting-results UI | Confirmation that the event ran, was cancelled or is active |

Maintain a private source register with title, original file, official URL, edition/date,
superseding document/bulletin, relevant clauses and unresolved questions. Do not expose
licence/contact/medical/identity information while extracting sports data. Public URLs
may later break; keep authorized private source files, not downloaded PDFs in Git.

## Before starting a new year

1. Obtain the new calendar, governing National/NR SSRs, relevant GCRs, amendments and
   event SRs when available. Record what is missing. "Largely similar" is not rule evidence.
2. Take an authorized private application backup before a big live edit; label whether
   it includes unpublished changes. Maintain the separate full-recovery package described
   in [recovery.md](recovery.md#5-private-recovery-package). Do not do a live export merely
   to develop or test the code.
3. Review points scales, class-only exclusion, class descriptions, minimum starts,
   crew-role credit, aggregation/countback and DNF/DNS policy. Use the capability table,
   not just numeric comparison. Stop results publication if a governing policy is unsupported.
   The admin's new-season action copies NR settings as placeholders, but does not copy
   RallyeSport events, classifications, scoring rules or membership decisions. Add new-year
   RS data only from its own sources; until its applicable RS rules are reviewed and supported,
   official classifications may be retained/displayed without championship points.
4. Rehearse with synthetic data or authorized simulation. The simulation requires a
   signed-in allowlisted admin and existing published data; it is not an offline empty
   project bootstrap. Do not publish test seasons into the real database.
5. Review global Site & info copy and useful links. `site.info.intro`, `tagline`,
   contact and social links are shared across years. Keep them evergreen; year-specific
   SSRs, calendar documents and data notes belong on the season.
6. Review the separate Getting started reference edition using the annual workflow below.
   Changing `site.currentSeason` does not update the bundled guide.

## Manual new season navigation

**Dashboard -> Start the next season** takes a year and a source season. The proposed
year is one greater than the greatest listed season, not necessarily the wall-clock year.
Review the year and source explicitly. The "Make it the season the public site opens on"
checkbox is optional; leave it off until the intended cutover.

The implementation copies championship name/short name, class definitions, numeric
points scales and minimum starts. It creates `status: planned`, empty events, rounds,
documents and notes, empty driver/co-driver classMaps, and MSA settings with a label but
no URL/date/confirmed rounds. It does not copy results, entry lists or `_aiImport` approval.
Shared person profiles remain available across seasons, but do not become entrants.

The admin now explicitly warns that copied settings are placeholders. **Manual creation
has no persisted annual-rule approval flag** and cannot prove you read the SSRs. Verification
is a mandatory operational step before publication; AI-imported rules have an additional
signature/evidence gate. Do not mistake that distinction for automatically approved rules.
If actual regulations are not available, do not claim verified scales/class descriptions
or publish classifications using unverified policies. Keep any preparatory draft private.

After Create season, the app opens **Events & calendar**:

1. Add each evidenced event; preserve its official name and date text. Venue/surface/
   links remain blank when not supplied. A link must come from official material, not
   guessed URL patterns. The event cards tolerate blank facts and events with no rounds.
2. Add scoring rounds only when their NR membership/day allocation is established.
   Calendar array order determines the displayed round number. Use stable IDs; moving
   or renaming rounds after data exists affects links, entry scopes and confirmations.
3. In **Season settings**, verify rules and add the selected year's SSR/calendar documents
   with title, kind, date, URL and explanatory note. Clear obsolete sources deliberately.
4. For AI setup instead, use **AI Import -> New season/Update season / regulations**,
   regulations first and calendar next. Supply official sources and resolve unsupported
   declarations; do not copy the supported policy as if it were extracted evidence.
5. Inspect **Review & publish**. Adding a season changes the season document and site
   index. Review all diffs, source links, identities and validation. Nothing goes live
   until the authorized publish; the default is a separate explicit decision.

## Calendar-only public behavior

With a published season and no classifications:

- Home keeps Calendar, Regulations & info and Getting started actions. It reports only
  nonzero **Events listed** and **Rounds listed** from supplied calendar records, not
  drivers scored, stage totals, leaders, entrants or completeness of the programme.
- Missing event metadata stays blank. Empty events/round allocations and empty
  documents have explanatory messages, not fabricated URLs, days or zero-stage claims.
- No entry list means no event-entry summary. An empty partial list also has no
  event count; its source and incomplete round coverage remain accessible.
  A complete empty list shows **0 NR Entries** because zero is evidenced.
  Partial nonempty lists qualify the count.
- Event counts deduplicate a resolved crew across days; round counts count only
  explicit crew day membership. An event-only entry does not imply every round.
  Unknown day scope and partial round coverage remain distinguished.
- Standings explain that entries alone do not score. Crews show entry-only people
  when evidence exists; shared profiles with no participation do not populate the year.
  Published DNS-only classifications also explain the absence of championship starts
  rather than leaving an empty standings table.
  Historical profiles remain reachable through older-season Crews or a stable profile link.
  Entry-only profile season blocks explain missing classification appearances instead
  of rendering an empty results table.
- Empty Sources links to the selected season's documents/calendar and entry provenance,
  not result-specific graph/points/MSA prose. Season notes remain scoped to that season.
  Populated seasons retain detailed classification status, points and discrepancy evidence.

The homepage's populated statistics are labelled **Rounds with results** and
**Recorded special stages**: neither measures events that ran without a published
classification or a planned stage programme. The existing computed-driver count remains
about the site standings, not total championship membership.

## Calendar status and date boundaries

Round dates are date-only ISO `YYYY-MM-DD`, not timestamps. The renderer requires both
the exact format and a real Gregorian date (including leap-day validation); browser
rollover of `February 30` is rejected. Invalid/blank dates display **Date to be confirmed**.
An invalid date is not silently treated as past or today. Cards and missing-round
pages display the unknown-date label only once; absent day descriptions add no separator.
Valid dates retain their future/today/past status alongside the formatted date.

Document dates are different from schedules. Info preserves supplied free-form source
date/edition text (escaped) and formats valid ISO dates; it never substitutes
"Dated Date to be confirmed" for source information. See [data-model.md](data-model.md).

Statuses for rounds with no classification compare the scheduled date to the current
South African calendar day (UTC+02:00, no daylight-saving change), independent of the
visitor's timezone. The switch occurs at 22:00 UTC on the previous UTC date.
Dates after today say **Upcoming**, today says **Scheduled today**, dates before today
say **Awaiting results**. Formatting uses UTC noon and an explicit UTC formatter, so
the printed day does not shift for a visitor in another timezone.

These are calendar/data-availability labels, not official event statuses. "Awaiting results"
means this site lacks a classification for a past scheduled date; it does not promise that
one will exist. Add cancellation/postponement facts in sourced calendar/season notes rather
than constructing a result. The page rerenders on navigation, not on a midnight timer;
an open page can need refresh at a date boundary. Clock accuracy also depends on the browser.
`season.status` is separately manually edited; dates never enable `site.activeRally`.

Calendar cards link to missing-round pages so visitors can read the reason and event/
document/entry-source links. No graph or classification status badge is invented there.
When data arrives, the source's final/provisional/unclear status takes precedence over
calendar labels. A graph's "Final" endpoint is not proof the source is final.

## Annual Getting started edition/source review

`assets/getting-started.js` is a bundled original guide, not a Firestore document, CMS or
regulation interpreter. Its `edition` object preserves the reference year and checked date
for maintainers; it does not produce a visible badge or checked-date warning. Source
editions remain explicitly labelled. **Never bump just `edition.year`.**
The guide remains readable with missing/unconfigured/failed results; no database read
or automatic source fetch is required to render it.

The maintainer reference edition remains 2026 until actual replacement documents are
reviewed. The guide directs readers to current regulations without implying the dated
sources were verified for another season. Selecting a newer default season does not
update the guide.
Guide content remains shared reference material, not a season-specific rules page.
The header retains its year selector/pill to avoid a layout jump. Existing year-prefixed
routes preserve the selected results context through guide topics, reload/history and
return links; changing the year keeps the same guide/topic and does not change its
content or reference edition. Legacy unprefixed guide links still work. With no
published season context the guide remains readable without inventing a season.
The shared NRC/NR/RS introduction describes RS as a club championship with standalone
or selected-stage shared programmes that vary by round, typically the lowest costs
without guaranteeing a price, and its own SSRs. Readers must check the applicable
RS SSRs and each round's event SRs/official programme for stages, entry/licensing and
costs. Its RS document link reuses the already documented 2026 reference; do not treat
that as verification of later regulations.

Annual review checklist:

1. Retrieve actual official NR SSRs, National SSRs, GCRs and relevant circulars.
   Confirm edition, date, supersession and applicable NR clauses.
   Do not extrapolate a rule from National to Regional without the actual applicability.
2. Recheck licensing/one-event eligibility, domicile, club membership, class definitions,
   car preparation/homologation, safety equipment, fuel and hierarchy/conflict wording.
   The software does not automatically interpret these or validate a person's eligibility.
3. Recheck spectator guidance, entry/documentation process, general fee comparisons,
   briefings/scrutiny, liaison/timecard/control explanations, penalties,
   provisional classification/protests and season planning. Avoid quoted prices,
   universal time-control targets, unsupported thresholds or official approval claims.
4. Keep spectator-first copy welcoming, the season and general event journey concise
   behind keyboard-accessible expanders, and the National/Regional comparison neutral.
   Avoid using an individual event's arrangements as general rules.
5. Rewrite dated technical content and sources together, then change the edition metadata
   and checked date to the actual review date. Record what was reviewed in this
   repository's release/decision docs; keep private interpretation evidence externally.
6. Run guide units, public browser/theme/print checks, analytics route privacy and active
   notice checks. Verify topic anchors and official HTTPS links; opening a source does
   not prove it remains current. Coordinate asset versions for an approved code release.
7. Before every push update affected docs and the release record. Guide code publication
   is separate from database publication and default-season selection.

## Each event: before, during, after

**Before:** add only official SR, entry, noticeboard and spectator links; update amendments
and sourced dates. Import supported NR entry evidence separately from results. Resolve
names against stable profiles; ask for actual day selections before assigning rounds.
If an authorized admin decides the rally is active, set **Site & info -> Rally in progress**,
name and validated HTTPS NRC destination, enable, then Review & publish.

**During:** this site remains a classification archive. Do not ingest live timing or
auto-open the notice based on the date. Official queries go to NRC/MSA/organizers.
The visit-scoped bypass leaves a yellow reminder; it is not a permanent opt-out.
Simulation can rehearse behavior but cannot change public settings.

**After:** obtain the official classification (retain provisional/unclear labels),
import one complete round, compare all row/status/page counts, times/positions and
retirement columns, resolve identities and evidence-backed overrides, and review
derived points. Do not infer DNS from a missing classified crew. Publish only when
authorized and checked; verify Classification, Stage times, Graph, standings and a
profile. Disable an active notice and publish at the intended end, as a separate
explicit settings decision.

**Later MSA points:** compare each listed role and round. Record justified class/credit/
extra-start discrepancies without changing printed data. Tick only the rounds that
match the official championship standings. Amended results/scoring invalidate relevant
confirmations. Manual editors rely on careful operator review; AI metadata is not proof
that the governing source was complete.

## Archive and default-season cutover

Keep old seasons in the site index and their bundles; do not relabel 2026 records as
2027. Stable person IDs and aliases are shared, but apps/entries/standings remain
season-specific. Changing the default does not erase archives or create new-year entrants.
Year-qualified round links preserve their original season. Season-relative Info links
and its picker now retain the selected year; global useful links are labelled shared.

At the intended cutover use **Season settings -> Open the public site on <year>**, review
the Site & info change and publish. Recheck Home, calendar statuses, documents, empty
standings/Crews/Sources, older-season navigation, historical profiles and guide edition.
No code release is required to create a supported season, but the guide may need one.
Take a private backup after the authorized publish and retain the prior one as well.
