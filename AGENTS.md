# Repository operating instructions

Start at [docs/README.md](docs/README.md), then [docs/recovery.md](docs/recovery.md).
These are the recovery entry points for a new authorized agent or contributor; do not rely
on a surviving chat, session directory, old checkpoint or memory of a deployment.

## Mandatory before EVERY push

The user requires documentation to be updated at **every single push**. Before pushing any
branch, update affected repository documentation and [docs/releases.md](docs/releases.md)
to describe the exact code and operational changes being pushed, validation, recovery
implications, approval scope and remaining limitations. If behavior did not change,
record that explicitly in the release record. A code-only push with stale recovery
documentation is not acceptable. Use [the release checklist](docs/releases.md#before-every-push).
This is a repository-specific contributor invariant, not a global user preference.

## Authorization and privacy

- Code work does not authorize a push, PR, deployment, rules change, season creation or
  database publish. Prior release approval does not authorize a subsequent release.
- This repository is public. Never commit real competitor fixtures, private working
  metadata, allowlists/account registers, tokens, actual Analytics Measurement IDs,
  personal backups or captured Google real-stream containers. Use synthetic test data.
- Do not invent future seasons, regulations, entrants, stage counts, dates, surfaces,
  event links or day allocations. Copying settings is a starting point, not verification.
- Prefer the authorized admin's Review & publish workflow. A future authorized direct
  Firebase change must atomically record site History before/after with user attribution
  and the explicit label **GitHub Copilot (direct Firebase)**, with working/public/revision
  coordination and version preconditions. A console edit followed later by a History
  entry does not satisfy this invariant. Stop if an atomic audited change cannot be made.
- Backups and private access/source artifacts are required for data recovery. Git alone
  cannot recover Firestore, photos, Auth users, owners, DNS or provider configuration.

## Engineering

- Keep the static hosting architecture and pure shared engine. Reuse existing contracts,
  validators and public projections; do not introduce bundled real results or live timing.
- Read [docs/scoring-rules.md](docs/scoring-rules.md) before altering scoring.
  Unknown SSR policy is unsupported until implemented and regression-tested, not until
  a reviewer checks a box. Preserve archived scoring and stable cross-season identities.
- Coordinate asset query versions across index, admin, disclaimer and privacy.
  Existing open tabs are not automatically upgraded; retire old admin tabs before new data.
- Preserve the guide's explicit reference edition and database-independent rendering.
  Do not relabel old technical/licensing rules as current merely by changing the year.
- Preserve GA global-default preinitialization, manual sanitized route categories,
  opt-out and admin exclusions. Never forward synthetic collection to real analytics.
- Run the smallest applicable synthetic tests, then browser regressions for public/admin
  changes. Keep dependencies, private tests and provider runtime snapshots outside Git.
  See [docs/testing.md](docs/testing.md). Review the full diff and untracked files.
