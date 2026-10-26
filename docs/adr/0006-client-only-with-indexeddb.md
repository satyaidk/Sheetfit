# ADR 0006: Client-only app with IndexedDB persistence

- Status: accepted
- Date: 2026-10-26

## Context

Users handle customer artwork and want to start immediately. A backend would add accounts, storage costs and a privacy surface without being needed for any core feature, because image decoding, layout and export all run well in the browser.

## Decision

Ship as a static Next.js app with no API routes. Persist projects in IndexedDB through the `idb` wrapper: project JSON in one store, original image blobs in another, shared between duplicated projects and garbage-collected on delete.

## Consequences

- No sign-up, no uploads, nothing to secure on a server; both routes are prerendered as static pages.
- Saved projects live in one browser profile. To move a sheet to another device, users export a `.sheetfit` project file (JSON with the original images in base64) and open it there.
- Storage quota errors are caught and explained to the user.
