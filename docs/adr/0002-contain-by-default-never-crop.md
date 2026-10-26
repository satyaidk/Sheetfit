# ADR 0002: Fit inside the box by default; distortion and cropping are opt-in

- Status: accepted
- Date: 2026-10-26

## Context

Users type a target size such as 90 × 60 mm for a logo whose proportions are often different. The two common behaviours are "cover" (fill the box, crop the overflow) and "contain" (fit inside, leave space). Cover produces a full box but silently removes parts of the design, which is unacceptable for logos and transfers: a cropped logo is a failed print.

## Decision

- The default mode is contain ("Fit entire image").
- Other non-distorting modes (fit width, fit height, fill remaining space, manual) also keep the whole image inside the box.
- Stretching requires an explicit confirmation that states both aspect ratios.
- Cropping is a separate, off-by-default control expressed as insets on the source; the original file is never modified.
- The properties panel always states the printed image size and the unused space.

## Consequences

- Designs may leave empty space in their boxes; the interface explains it instead of hiding it.
- A property-style unit test asserts that no non-distorting mode places image pixels outside the box or changes the aspect ratio.
