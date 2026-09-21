---
name: seshat-submit-framework-feedback
description: Interview a business project's responsible human or Agent one question at a time when Seshat behavior appears wrong, assemble a complete privacy-reviewed framework issue, and submit it as a persistent Markdown review record to the Seshat Provider's frozen artifacts/review path without modifying the business project. Use when audit, diagnosis, consultation, standardization, installation or another Seshat capability produced an unsatisfactory result that may indicate a Seshat specification, Skill, CLI, classification, path-governance or Authority-routing defect rather than a business-project fact.
---

# Submit Seshat Framework Feedback

This Skill is a feedback route **to Seshat itself**. It is distributed to governed business projects, but its output is not a business-project governance artifact and must never be written under that project's `artifacts/`, `generated/`, `docs/` or OpenSpec workspace.

## Progressive interview Contract

Ask exactly one question per turn. Reuse facts already provided and never present the reporter with a batch questionnaire. Accept `unknown` when the reporter genuinely cannot know; do not invent an answer.

Ask only the next unanswered item, in this order:

1. Which business project and responsible human/Agent experienced the problem, and which Seshat Skill or CLI result was unsatisfactory?
2. What did the reporter expect Seshat to do or return?
3. What did Seshat actually do or return?
4. What is the shortest reproducible sequence? If it cannot be reproduced, record that explicitly.
5. Which bounded evidence can be cited: command, result JSON, Finding code, file path or short redacted excerpt?
6. Why does the reporter suspect Seshat's internal specification, classification, Skill or CLI logic rather than the business project's own facts or Contract?
7. What impact did the behavior have, and how often does it occur?
8. Which Seshat version, operating system, Runtime and installation route were used?
9. Has every credential, user datum, proprietary source excerpt, raw log, Crash content and unrelated Runtime value been removed or redacted?

After all answers are complete, draft a concise title and category, show one complete issue summary, and ask one final confirmation question. Do not submit before that confirmation.

## Privacy and evidence boundary

- Never recursively inspect the business project for this interview.
- Do not attach files or copy raw source, logs, Crash data, credentials, user data or Runtime state.
- Prefer stable references, Seshat JSON results, Finding codes and short redacted summaries.
- If sensitive data remains, stop and ask the reporter to redact it; the CLI rejects `containsSensitiveData=true`.
- Distinguish “Seshat result is surprising” from “Seshat internal logic is defective”. The issue may record uncertainty; it must still explain the attribution hypothesis.

## Submit

Build a JSON input matching `framework-feedback-issue.schema.json`, preferably in a temporary location outside the business repository. Preview:

```bash
seshat feedback submit \
  --input /absolute/temporary/seshat-feedback.json \
  --provider-root /absolute/seshat-provider \
  --dry-run --json
```

After the final reporter confirmation, submit:

```bash
seshat feedback submit \
  --input /absolute/temporary/seshat-feedback.json \
  --provider-root /absolute/seshat-provider \
  --json
```

When the business-project Agent has no Seshat repository access, use the Seshat-owned endpoint configured by the maintainer instead:

```bash
seshat feedback submit \
  --input /absolute/temporary/seshat-feedback.json \
  --endpoint https://<seshat-provider>/feedback \
  --dry-run --json

seshat feedback submit \
  --input /absolute/temporary/seshat-feedback.json \
  --endpoint https://<seshat-provider>/feedback \
  --json
```

The Seshat Provider writes one immutable human/Agent review record at the path already frozen by the requirements canon:

```text
<seshat-provider>/artifacts/review/<issue-id>.md
```

The temporary JSON input is validated by `framework-feedback-issue.schema.json` but is not persisted as a second review artifact. A local Seshat source checkout is detected automatically; otherwise an operator must provide `SESHAT_PROVIDER_ROOT`, `--provider-root`, `SESHAT_FEEDBACK_ENDPOINT` or `--endpoint`. If no authorized Provider route exists, stop with `FEEDBACK_PROVIDER_UNAVAILABLE`; never fall back to writing inside the business project or falsely claim submission.

## Responsibility boundary

- This Skill collects and submits framework feedback; it does not audit, standardize or repair the business project.
- A submitted Issue is a `2.1.2.9 持久产物` in the `review` class, not Seshat Authority and not an accepted defect.
- Seshat maintainers own triage. Confirmed changes must enter the applicable OpenSpec Change before implementation.
- Repeating the identical issue returns the same deterministic ID and `no-changes`; existing different content is never overwritten.
