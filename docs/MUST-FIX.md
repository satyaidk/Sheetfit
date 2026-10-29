# Must fix: UX and logic audit (2026-10-29)

The user found the editor hard to use on phones and desktops. This file lists every problem found in a full
audit, in the order to fix them. **Nothing here has been fixed yet.**

## How to use this file (for the next agent)

1. Work top-down: **P0** first (data loss, blocked tasks), then **P1**, then **P2**. One item per commit, with its ID
   in the commit message (`MF-03: ...`).
2. Each item says what is wrong, the evidence, where the code is, a suggested direction, and **Done when** (the
   acceptance check). The direction is a starting point; the acceptance check is the contract.
3. Re-run the walkthrough before and after a layout change (see "How this was measured") and compare screenshots.
4. When an item is done, tick it here (`- [x]`), add a line to the AGENTS.md update log, and delete the matching
   known issue in AGENTS.md section 7 if there is one.
5. Do not start new features until every P0 is ticked.

## How this was measured

- Production build (`npm run build && npx next start -p 3200`), headless Chromium (Playwright, SwiftShader).
- Viewports: desktop 1440 × 900, tablet 768 × 1024, phone 390 × 844 (touch, `isMobile`).
- Flows: first run, start dialog dismissed, sample project, select a design, Products / Designs / Sheet panels,
  Download dialog, `/editor?product=tee-left-chest`, phone preview, touch tap and drag, File menu.
- Measured per state: horizontal overflow, controls under 32 px, controls without a name, visible text under 12 px.
- Scripts: `scripts/ux-audit/walk.js <w> <h> <tag>` and `scripts/ux-audit/mobile-probe.js` (need a server on port
  3200 and Playwright; set `OUT=<folder>` for the screenshots). Evidence: `docs/images/audit/*.webp`.
- Code read: every editor, panel, product and dialog component, `editor-actions.ts`, the store, preflight, the
  layout helpers. `npm run check` is green, so these are UX and logic problems, not failing tests.

Measured numbers (worst state per viewport):

| Viewport | Controls | Under 32 px | Text under 12 px | Overflow |
| --- | --- | --- | --- | --- |
| Desktop 1440 | 176 | 66 | 240 elements | none |
| Tablet 768 | 99 | 44 | 217 elements | none |
| Phone 390 | 94 | 39 | 217 elements | none |

---

## P0: loses work or blocks the task

- [ ] **MF-01 Opening a project file throws away unsaved work without asking.**
  File → "Open .sheetfit file" (`Header.tsx:128`) and Projects → Import (`ProjectsPanel.tsx:82`) call
  `importProjectFile` directly. Product cards ask first (`requestLeave` → `LeaveDialog`); these do not.
  Direction: add a `LeaveIntent` kind `"import"` that carries the `File`, route both through `requestLeave`.
  Also make Projects → open use `hasWorkToLose()` instead of `project.dirty` (`ProjectsPanel.tsx:100`).
  Done when: with an unsaved image on the sheet, all three paths show the Save / Discard / Cancel dialog, and a test
  in `tests/v04-product-flow.test.ts` covers the import intent.

- [ ] **MF-02 No autosave: a refresh, crash or closed tab loses everything not saved by hand.**
  Only a `beforeunload` prompt exists (`use-editor-shortcuts.ts:160`); nothing restores on load.
  Direction: debounce (2 s) a draft save of `currentProjectRecord` to IndexedDB under a fixed draft key; on
  `/editor` load, if a draft newer than the last save exists, show "Restore your unsaved sheet?" (Restore / Discard).
  Done when: add an image, reload, and the work comes back after one click; a unit test covers the draft key.

- [ ] **MF-03 The desktop canvas is crowded out.** Six surfaces share 1440 px: icon rail, 360 px side panel,
  quick-actions bar, 248 px preview dock floating over the canvas, 312 px properties panel, pages bar and footer.
  The sample sheet shows at 26 to 31 % zoom in about a third of the width (`desktop-sample.webp`,
  `desktop-selected.webp`). The dock covers part of the sheet. Users cannot see their work.
  Direction: one right column. Put the live preview as the top card of the properties panel (no floating dock over
  the canvas); close the side panel after a product or design is picked; re-run zoom-to-fit when panels open or close;
  never let the canvas get narrower than half the window.
  Done when: at 1440 × 900 with the sample loaded and a design selected, the sheet is at least 55 % of the window width,
  nothing overlaps it, and the preview is still visible.

- [ ] **MF-04 Tablets get the desktop layout squeezed.** At 768 px the side panel (rail + 360 px) leaves about 340 px
  for the canvas; the sheet sits at 26 % zoom and the quick bar is cut off (`tablet-products.webp`,
  `tablet-sample.webp`). `EditorLayout.tsx` switches to bottom sheets only below 768 px.
  Direction: below 1024 px open panels as an overlay drawer over the canvas (not beside it) that closes after an
  action; or use the phone layout up to 1023 px.
  Done when: at 768 × 1024 the sheet fills at least 85 % of the width with no panel open, and a panel never shrinks it.

- [ ] **MF-05 Phone panels hide the whole editor and trap the user.** Products, Designs and Sheet open as modal
  bottom sheets up to 85 % high (`phone-products-sheet.webp`, `phone-sheet-panel.webp`); the canvas is not visible
  while choosing; Escape does not close them; the header (Download, Undo) cannot be pressed while one is open
  (verified: the click is intercepted). Picking an item does not close the sheet.
  Direction: snap points (about 45 % and 85 %), start at 45 %; non-modal for Products, Designs, Uploads, Layers;
  Escape and swipe-down close; close automatically after a product, design or upload is chosen.
  Done when: on 390 × 844 the user can pick a design and see it land on the sheet without closing anything by hand,
  and Escape closes every sheet.

- [ ] **MF-06 Text is too small and some buttons have no name.**
  Visible text under 12 px: 240 elements on desktop, 217 on tablet and phone. In code: `text-[11px]` × 23,
  `text-[11.5px]` × 11, `text-[10.5px]` × 5, `text-[10px]`, `text-[9px]` (worst in `ProductsPanel.tsx`,
  `LivePreviewDock.tsx`, `CanvasWorkspace.tsx`, `NumberField.tsx`, `ExportDialog.tsx`, `ProjectsPanel.tsx`).
  On phones the Download button is icon-only and its accessible name is empty (`Header.tsx:191`, the label span is
  `hidden sm:inline`); the same pattern hides the Preview label (`QuickActionsBar.tsx:90`).
  Direction: minimum 12 px for meta text, 13 to 14 px for labels and body (tokens in `globals.css`); add `aria-label`
  to every button whose visible text can be hidden.
  Done when: the walkthrough metric "text under 12 px" is 0 and every button has a non-empty accessible name at all
  three viewports.

## P1: hard to use

- [ ] **MF-07 Touch targets are too small.** Phone: Undo, Redo, Save 31 × 32; page options 24 × 24; chips 26 to 28 px
  high; colour swatches 20 × 20; dock buttons 28 × 28. Tablet: Undo, Redo, Save 21 × 32. Up to 66 controls under 32 px.
  Done when: on touch devices (`pointer: coarse`) every control is at least 44 × 44 px (hit area may be larger
  than the drawn icon).

- [ ] **MF-08 The print process is set in three places.** Header segmented control, a Sublimation/DTF filter in
  the Products panel, and the Sheet panel; the Products panel also has a second filter row (All, Drinkware, ...),
  so users see two rows of chips before any product. It is unclear which one changes the page.
  Direction: the process lives on the page (header + Sheet panel only). The Products panel shows products for the
  page's process with one line "Showing sublimation products · Show all", and one category row.
  Done when: there is one control that changes the process, and the Products panel has a single chip row.

- [ ] **MF-09 The quick-actions bar is cut off with no hint.** Labels end mid-word ("Prev", "T-shirt, Left cl") at
  tablet and phone widths and at 1440 px with both panels open (`desktop-selected.webp`, `phone-product-link.webp`).
  Direction: measure the bar; move what does not fit into a "More" menu instead of scrolling.
  Done when: no control in the bar is clipped at 390, 768 or 1440 px.

- [ ] **MF-10 Rulers on phones.** Both rulers show on 390 px, use space and their numbers are unreadable.
  Done when: rulers are hidden below 768 px (still available from the View menu).

- [ ] **MF-11 Phone dialogs overlap their own content.** Download: the "Mirrored for transfer" banner sits on top
  of the page preview (`phone-export.webp`). Product preview: the "3D model" option wraps onto two lines and the
  "Drag to turn. Scroll or pinch to zoom." hint is clipped behind the 3D / Flat switch (`phone-preview.webp`).
  Done when: no element overlaps another in either dialog at 390 px.

- [ ] **MF-12 Toasts cover the page strip.** The "... ready" toast after opening a product sits on the pages bar
  and footer at every width (`phone-product-link.webp`).
  Direction: top-centre on phones, offset above the pages bar on desktop; shorten the text.
  Done when: no toast covers a control.

- [ ] **MF-13 Designs can be dragged on top of each other with no warning.** Overlap is only reported in the
  Download dialog's pre-print check (`lib/export/preflight.ts:64`). `phone-overlap-after-drag.webp` shows one
  badge dragged over the other. Overlapping transfers waste a sheet.
  Direction: while dragging, tint overlapping designs and show the overlap in the pill; snap to a 2 mm gap.
  Done when: dropping a design onto another shows a visible warning on the canvas before export.

- [ ] **MF-14 The selection pill covers neighbouring designs.** The copy / lock / delete / more pill is drawn under
  the selection, on top of the next row (`desktop-selected.webp`, `phone-overlap-after-drag.webp`).
  Done when: the pill is placed where it covers no other design (above, below or beside the selection).

- [ ] **MF-15 Home-page links stay in the address bar.** After `/editor?sample` or `/editor?product=...` the query
  stays; a refresh loads the sample or a new product again and wipes the work (only the browser prompt protects it).
  When there is work to lose, `?product=...&process=dtf` drops the process (`EditorLayout.tsx:77`, `requestProduct`
  takes no process).
  Done when: the query is removed with `history.replaceState` once handled, and the process survives the leave
  dialog.

- [ ] **MF-16 "Or open the sample sheet" in the empty state does not ask.** `CanvasWorkspace.tsx:685` calls
  `loadSampleSheet()` directly. The empty state shows when the *active page* is empty, but other pages can hold work.
  Done when: it goes through `requestLeave({ kind: "sample" })`.

- [ ] **MF-17 The "Delete page" action in the "added on page N" toast deletes by index, without confirmation.**
  `editor-actions.ts:220` captures `pageNumber - 1`; if pages are added or deleted before the click, it deletes a
  different page, and page deletion cannot be undone.
  Done when: the action deletes by page id (or is replaced by Undo) and a test covers adding a page in between.

- [ ] **MF-18 First impression of the editor is empty and heavy.** The first-run start dialog on phones scrolls under
  the bottom tab bar (`phone-start-dialog.webp`); the empty canvas shows a small dashed sheet and three choices.
  Direction: on phones show the start dialog full-screen above the tab bar; after "Start designing" open the
  Products sheet directly.
  Done when: the start dialog's buttons are never under the tab bar at 390 × 844.

- [ ] **MF-19 Product pictures are out of date** (13 drinkware pictures still show the old cone-inside, wire-handle
  models; ADR 0012, rule 17). The render scripts are not in the repo.
  Done when: the scripts live in `scripts/` and the pictures are re-rendered.

## P2: clean-up

- [ ] **MF-20** `placeAssetAt` (`editor-actions.ts:293`) removes a history entry by slicing `past` from outside the
  store. Move it into a store action that places and positions in one history step.
- [ ] **MF-21** Unused code after the home page rewrite: `.home [data-reveal]`, `home-rise`, `home-fade`,
  `home-inkbar` CSS, `FeatureGrid` in `HomeSections.tsx`; `lib/landing/sheet-demos.ts` is only used by tests.
  Delete or use them.
- [ ] **MF-22** The phone header shows the project name cut to about 10 characters ("Sample sh..."). Show it in the
  File menu, or let the name wrap under the logo.
- [ ] **MF-23** `Sublimation & DTF images/` (33 third-party images) is in `.gitignore` but committed. Remove it from
  git (`git rm -r --cached`) once the user agrees.
- [ ] **MF-24 Tests for all of the above.** Port `scripts/ux-audit/*.js` into a Playwright suite (`tests/e2e/`) that runs
  the walkthrough at 1440, 768 and 390 px and fails on: any overflow, any unnamed button, text under 12 px, touch
  targets under 44 px on touch, any console error, and the P0 data-loss paths. Run it in CI.

## Checked and working (no action needed)

- No horizontal overflow at any viewport; no console errors in any flow.
- Touch: tapping a design selects it; one-finger drag moves it.
- Download dialog: page-by-page preview, mirrored output shown, pre-print check lists low DPI and empty boxes.
- Product cards ask before replacing work (`requestProduct` → `LeaveDialog`), and products land on a new page when
  they need another sheet or process.
- File menu opens on phones; the Download button opens the dialog on phones (it just has no name, MF-06).
