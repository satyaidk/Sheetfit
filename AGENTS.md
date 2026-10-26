<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sheetfit: living project report

**This file is the single source of truth for what Sheetfit is, what state it is in, and what to do next.**
Every agent (and human) must read it before starting work and update it in the same change as any code,
feature, plan or known-issue change. Keep entries short and factual. Newest updates go at the top of
"Update log".

Last updated: 2026-10-27

## 1. Product in one paragraph

Sheetfit is a browser-only, Canva-style layout editor for sublimation and DTF printing. Users upload
images, pick a product or type a physical size (mm/cm/in/px), and place designs on a print sheet
(A4 today). Default fitting never crops or distorts. Output: exact-size PDF, PNG/JPEG with DPI metadata,
browser print at 100%, and a portable `.sheetfit` project file. No backend; projects live in IndexedDB.

## 2. Current status

| Area | State |
| --- | --- |
| v0.1 core (fitting engine, A4 sheet, multi-design, exports, print, IndexedDB, project files) | Done, tested |
| v0.1 UI (cutting-mat theme) | **Rejected by the user on 2026-10-27** as unattractive and "vibecoded". Being replaced in v0.2 |
| v0.2 research (Canva-style UX + product size catalogue) | In progress, notes in `research_notes/Canva UX and print size catalogue/` |
| v0.2 redesign + product templates | Not started; plan in section 6 |

## 3. Commands

```bash
npm run dev            # http://localhost:3000, sample at /editor?sample
npm run check          # lint + typecheck + tests with coverage + production build (must pass before done)
npm test               # vitest
```

- Windows: run from an upper-case `C:\` path; a lower-case `c:\` path makes every Vitest file fail
  ("reading 'config'").
- Browser verification: the Claude-in-Chrome extension may be disconnected. Fallback used so far:
  `puppeteer-core` driving installed Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`)
  from a scratch folder, against `npm run build && npx next start -p 3200`.

## 4. Architecture rules (do not break)

1. **Millimetres only in the document.** Convert at the edges via `src/lib/layout/coordinate-conversion.ts`.
2. **No silent crop or distortion.** Non-stretch fit modes keep the image inside the box with its exact
   aspect (enforced by `tests/image-fit.test.ts`). Stretch needs confirmation; crop is opt-in.
3. **One render plan** (`src/lib/render/render-plan.ts`) feeds PNG, JPEG, PDF, print and preview.
4. **Layouts never resize designs to fit**; they report what does not fit.
5. Pure logic in `src/lib` (tested in Node); `src/store` orchestrates; components render.
6. Konva only in client components loaded with `next/dynamic({ ssr: false })`.

## 5. File map (where things live)

| Path | Responsibility |
| --- | --- |
| `src/types/{editor,image,project}.ts` | Document model (`EditorDocument`, `Design`, `PageSettings`), assets, project records |
| `src/lib/image/image-fit.ts` | Fitting engine: `fitContain`, `computeImageRect`, `normalizeBox`, `resizeBox`, `describeFit` |
| `src/lib/image/image-resolution.ts` | Effective DPI and quality bands (250/150) |
| `src/lib/image/image-loader.ts` | File validation, decoding, alpha detection, EXIF orientation |
| `src/lib/layout/a4-layout.ts` | Page size, printable rect, rotated bounds, clamp/centre |
| `src/lib/layout/alignment.ts`, `drag.ts` | Align, snap guides, grid snap, drag resolution |
| `src/lib/layout/auto-arrange.ts` | Shelf packing, grid repeat, fix suggestions |
| `src/lib/render/render-plan.ts` | Shared render plan, crop marks |
| `src/lib/export/*` | Canvas rasteriser, PDF (pdf-lib), DPI metadata, raster export, print |
| `src/lib/storage/*` | IndexedDB projects, `.sheetfit` files |
| `src/lib/editor-actions.ts` | Use-cases: upload, save, open, import/export project file |
| `src/lib/sample.ts` | Generated sample sheet (`/editor?sample`) |
| `src/store/editor-store.ts` | Zustand store: doc + undo history, assets, selection, view (zoom/pan), dialogs |
| `src/components/editor/*` | Workspace (Konva), rulers, toolbars, sidebar, properties panel, shortcuts |
| `src/components/settings/*`, `uploads/*`, `export/*`, `ui/*` | Panels, dialogs, shadcn-style primitives |
| `tests/*` | Vitest suites (107 tests at v0.1) |
| `docs/` | Design doc, ADRs 0001–0006, learning path, printing guide, screenshots |

## 6. Plan

To be expanded after the v0.2 research completes (see section 2).

## 7. Known issues / to fix

- v0.1 UI judged generic; full visual and UX redesign required (v0.2).
- No mirror/flip option yet (needed for sublimation).
- Only A4 sheets; many products (30oz/40oz tumblers, shirt fronts) need A3 or roll sheets.
- No browser e2e tests in CI (manual puppeteer runs only).
- README badges assume GitHub repo `satyaidk/tool-bar` (no remote configured yet).

## 8. Update log

- **2026-10-27**: User rejected v0.1 UI. Started v0.2: deep research on Canva-style editor UX and on
  sublimation/DTF product print sizes. Turned AGENTS.md into this living report.
- **2026-10-26**: v0.1 shipped (uncommitted): core engine, A4 editor, exports, print, IndexedDB,
  `.sheetfit` files, 107 tests, docs set.
