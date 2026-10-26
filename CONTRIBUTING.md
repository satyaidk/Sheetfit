# Contributing to Sheetfit

Thank you for helping. This guide covers how to set up the project, the conventions the code follows, and what a pull request needs before review.

## Development setup

```bash
npm ci
npm run dev          # http://localhost:3000, sample sheet at /editor?sample
```

Requirements: Node.js 20.9 or newer and npm 10 or newer.

> **Windows note.** Run commands from a path that starts with an upper-case drive letter (`C:\...`). Vite, which Vitest uses, can load modules twice when the same folder is reached as `c:\...`, and every test file then fails with `Cannot read properties of undefined (reading 'config')`.

## Before opening a pull request

```bash
npm run check
```

This runs ESLint, the TypeScript compiler in strict mode, the Vitest suite with coverage thresholds, and a production build. CI runs the same steps.

If your change affects canvas interaction, export or printing, also check it in a browser:

1. Open `/editor?sample`.
2. Export a PDF and confirm the page is 210 × 297 mm (or 297 × 210 mm in landscape) in your PDF viewer's document properties.
3. Export a PNG at 300 DPI and confirm it is 2480 × 3508 px.

## Project conventions

### Where code goes

- `src/lib/` holds pure logic: no React, no store access, and DOM APIs only in clearly named browser adapters (`image-loader.ts`, `rasterize.ts`, `export-raster.ts`, `print.ts`, `project-storage.ts`). New geometry or layout rules belong here, with tests.
- `src/store/` orchestrates `lib/` functions and holds editor state. It should not contain geometry formulas.
- `src/components/` renders state and forwards user intent to the store or to `lib/editor-actions.ts`.

### Invariants

- **Millimetres in the document.** Never store pixels or points in `EditorDocument`. Convert at the edges with `coordinate-conversion.ts`.
- **No silent cropping or distortion.** A default code path must never place image pixels outside a design box or change an image's proportions. Tests in `tests/image-fit.test.ts` enforce this; extend them when adding a fitting mode.
- **One render plan.** New output formats draw from `buildRenderPlan`, so previews and exports cannot diverge.
- **Never resize to make a layout fit.** Report what does not fit instead.

### Style

- TypeScript strict mode, no `any`.
- Each module starts with a short comment explaining why it exists and what rule it owns.
- Match the surrounding code's naming and comment density.
- Tailwind utility classes with the tokens defined in `src/app/globals.css`; do not introduce new colours inline.

### Writing in the interface

- Name things by what the user is doing ("Export PDF", not "Submit").
- Keep the same verb through a flow: the **Export** button produces an "Exported" toast.
- Errors say what happened and how to fix it, without apologising.
- Sentence case everywhere.

## Commits and pull requests

- Keep pull requests focused on one change.
- Write commit messages in the imperative mood ("Add bleed guides").
- Update `CHANGELOG.md` under "Unreleased" for user-visible changes.
- For a significant design change, add an ADR in `docs/adr/` using the existing ones as a template.

## Code of conduct

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
