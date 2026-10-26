# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-26

### Added

- A4 sheet editor with portrait and landscape orientation, per-side margins, printable-area guide, millimetre rulers, grid, and snapping to the page, margins and other designs.
- Image upload for PNG, JPEG and WebP by file picker, drag and drop, or clipboard paste, with transparency detection and file validation.
- Non-cropping fitting engine with six modes: fit entire image (default), fit width, fit height, fill remaining space, manual scale, and stretch (with confirmation).
- Measurement inputs in mm, cm, inches and pixels, size presets, aspect-ratio lock, padding, alignment inside the box, rotation and optional non-destructive cropping.
- Multiple designs per sheet: duplicate, copy and paste, multi-select, grouping, alignment, layer order, grid repeat with capacity reporting, and auto-arrange without overlap.
- Print-quality indicator based on effective DPI at the printed size.
- Exports: exact-size A4 PDF with vector placement and unrecompressed PNG/JPEG sources; PNG and JPEG at 150, 300 or 600 DPI with DPI metadata; optional crop marks and cut-line borders.
- Browser printing at actual size with A4 `@page` rules and print-dialog guidance.
- Local projects in IndexedDB: save, open, duplicate, delete, with thumbnails.
- Portable `.sheetfit` project files that embed the original images, for reopening on another computer.
- Undo and redo, keyboard shortcuts, and an unsaved-changes guard.
- Responsive layout with bottom-sheet panels on small screens.
- Unit test suite (Vitest), CI workflow, design document and ADRs.
