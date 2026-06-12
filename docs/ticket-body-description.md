# Notion Ticket Body Analysis and Scraping Strategy

## What this HTML appears to be
This is a full Notion page render (app shell + sidebar + content region) and it **does look like a ticket record page**.

Evidence from this body:
- Multiple structured property rows (`role="row"`) with a label cell and value cell (`data-testid="property-value"`).
- Ticket-like fields are present: `Status`, `Assignees`, `Requestor`, `Product`, `Blocked?`, `ID`, `Priority`, `Last edited time`.
- Ticket-like values exist:
  - `Status`: `Blocked`
  - `ID`: `428`
  - `Priority`: `Low`
- A `Comments` section is present.
- There is an external linked object block (`notion-external_object_instance-block`) pointing to a GitHub PR.

## Title signal found in this sample
A strong title candidate is visible in the embedded external object card:
- `ACR Login: Use Azure SDK library to get the credential and token`

Note:
- In this saved HTML, a canonical Notion page title node is not clearly isolated in the provided section (likely dynamic/virtualized/truncated), so use fallback logic.

## Recommended detection logic (is this a ticket?)
Return `isTicket = true` when at least one of these is true:

1. High-confidence rule:
- At least 3 known ticket property labels are present from this set:
  - `Status`, `Priority`, `Assignees`, `Requestor`, `ID`, `Product`, `Blocked?`, `Date`

2. Medium-confidence rule:
- `Comments` section exists AND at least 2 property rows exist.

3. Optional score-based fallback:
- +2 for `Status`
- +2 for `ID`
- +1 for `Priority`
- +1 for `Assignees`
- +1 for `Requestor`
- +1 for `Comments`
- Ticket if score >= 5

## Recommended title extraction order
Use first non-empty value from this chain:

1. Primary Notion title selectors (live DOM first):
- A dedicated Notion page title node if present.
- Top content text block near the page header with title-like semantics.

2. Property-based title fallback:
- A property named `Title`, `Name`, or similar (if present in property rows).

3. External object fallback (works in this sample):
- In `.notion-external_object_instance-block`, read the main bold line text.
- For this sample, extracted candidate:
  - `ACR Login: Use Azure SDK library to get the credential and token`

4. Final fallback:
- First non-empty long text block in main content (`>= 12 chars`, not `Comments`, not `Empty`).

## Suggested output shape
```json
{
  "isTicket": true,
  "confidence": 0.92,
  "title": "ACR Login: Use Azure SDK library to get the credential and token",
  "ticketId": "428",
  "status": "Blocked",
  "priority": "Low"
}
```

## Implementation notes
- Ignore sidebar and topbar text when scraping content.
- Limit extraction to `main#main` region.
- Normalize whitespace and trim labels/values.
- Treat `Empty` as null.
- Keep selector logic defensive because Notion DOM classes can change.
