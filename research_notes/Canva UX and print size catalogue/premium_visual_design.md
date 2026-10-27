# Premium visual and interaction design for a Canva-like print-layout editor (React + Tailwind + Radix/shadcn)

Scope note: about 18 tool calls. Some official sites (m3.material.io, Apple HIG, Spectrum token pages) rendered without body text through the fetch tool. Values that come from the researcher's prior knowledge rather than a fetched source are labelled **[unverified]** and listed under Inferences or Gaps, never under Cited Findings.

## 1. Design-system values from editors and pro tools (Canva, Figma UI3, Spectrum, Linear)

### Takeaway
Pro editors converge on four things. The canvas comes first and the chrome stays quiet: floating or collapsible panels and a slim, context-sensitive toolbar. Colour is mostly neutral with one restrained accent. Density is high but aligned. Elevation is expressed through surface levels rather than many borders. Few vendors publish exact pixel values for their editor chrome (Figma and Canva publish almost none), so most pixel numbers have to come from open design systems (Spectrum, Material) or be measured.

### Cited Findings
- Figma UI3 (2024): panels are "resizable, collapsible, and floating". The toolbar is slim and sits at the bottom of the canvas, which frees space at the top. The UI can be hidden completely. Hover-only UI and auto-appearing sidebars were explored and rejected as "too unstable". The guiding principle is "Center your ideas, not Figma's UI." — [Figma blog: Behind our redesign UI3](https://www.figma.com/blog/behind-our-redesign-ui3/)
- Figma UI3 visual language: inputs have backgrounds, dropdowns have borders, and corners are rounded. Property labels are optional and can be toggled. Width, height and Auto Layout merge into one layout section placed below X/Y "to protect muscle memory". About 200 new icons were hand-drawn by Tim Van Damme. — [Figma blog](https://www.figma.com/blog/behind-our-redesign-ui3/)
- The Figma blog post gives no panel widths, font sizes, radii or icon pixel sizes. Forum users complained that UI3 text and inputs are "really small" and that the right panel is too narrow for long values. Staff suggested changing interface scale, which also scales the canvas. — [Figma forum: UI3 properties panel gripes](https://forum.figma.com/archive-21/ui3-properties-panel-gripes-8217); [Figma forum: font size for controls](https://forum.figma.com/suggest-a-feature-11/new-ui-font-size-adjustment-for-controls-24031); [Figma forum: panel width](https://forum.figma.com/ask-the-community-7/the-width-of-the-properties-panel-hinders-when-the-values-have-long-content-1647)
- Canva "Glow Up" (2024): the side panel was rebuilt. Hovering a tab previews its contents and clicking pins the panel open. The tabs (Templates, Elements, Fonts, Brand Kit, Draw, Projects, Apps) are unchanged. — [Canva Help: Glow up](https://www.canva.com/help/glow-up/)
- Canva Glow Up: a light-themed editor, a floating object panel showing the most relevant tabs, and the fixed toolbar replaced by a context-sensitive "quick actions" toolbar (image selected gives photo tools; text selected gives font options). Editing, Commenting and Viewing modes. Gradual rollout. — [Small Business Trends](https://smallbiztrends.com/canva-glow-up-launched/)
- A third-party (unofficial) description of Canva's design system: Canva Sans as the custom geometric typeface, #ffffff primary background, #f4f5f7 for section breaks and sidebars, a violet-to-cyan brand gradient, and an editor sidebar of 320px that collapses to 56px icons. This is NOT Canva documentation; treat it as observation. — [open-design.ai design-system-canva](https://open-design.ai/plugins/design-system-canva/)
- Adobe Spectrum tokens: `spacing-100` = 8px, `blue-900` = #3B63FB, font family "Adobe Clean Spectrum VF". Tokens are aliased in chains (global, then alias, then component). Other named tokens include `corner-radius-75`, `divider-thickness-small` and `tooltip-maximum-width` (values not shown on the page). Full values live in the spectrum-design-data repo. — [Spectrum: Design tokens](https://spectrum.adobe.com/page/design-tokens/)
- Linear redesign: theme generation moved from HSL to LCH ("perceptually uniform"). Themes went from 98 hand-defined variables to 3 inputs (base colour, accent colour, contrast). Contrast is a variable, so high-contrast themes can be generated. Blue was limited in chrome for a "more neutral, timeless look". Text and neutral icons were darkened in light mode and lightened in dark mode. Labels, icons and buttons were aligned vertically and horizontally, which users "feel after a few minutes". Inter Display is used for headings and Inter for body. Elevation uses LCH surface levels (background, panel, dialog, modal), explored with black and white opacities. — [Linear: How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)

### Inferences
- Recommended spec for this app. Values are derived, not documented by the named vendors.
  - **Type:** 12-13px UI text for panels and toolbar labels, 11px for secondary captions, 14px for primary controls and dialogs. A single sans family (Inter or Geist), with a display cut for headings (the Linear pattern). Use `font-variant-numeric: tabular-nums` in numeric inputs (W, H, X, Y, mm values).
  - **Panels:** left asset panel about 320-360px plus a 56-72px icon rail (consistent with the unofficial Canva figures). Right properties panel about 240-280px and resizable (Figma made its panel resizable after complaints that it was too narrow).
  - **Toolbar:** a contextual top bar about 48px tall, with a floating, object-anchored quick-actions bar.
  - **Controls:** 28-32px high on desktop, 40-44px on touch.
  - **Spacing:** an 8px base unit with a 4px half-step (Spectrum `spacing-100` = 8px).
- **Radii [unverified]:** 6-8px for controls, 10-12px for floating panels and popovers. Keep radii nested: inner radius = outer radius minus padding. The shadcn v4 default `--radius` is 0.625rem (10px). Unverified this session.
- **Icons [unverified convention]:** 16px icons inside 28-32px buttons and 20px in the rail, at a 1.5px stroke (lucide's default is 2px; reducing `strokeWidth` to 1.5 on small sizes reads more refined). Use one icon set only.
- **Colour:** neutral greys with a slight cool or brand tint, defined in OKLCH (Tailwind v4 and shadcn v4 already use OKLCH). One accent, used only for selection, primary CTA and focus.

### Gaps
- No official Figma UI3 pixel values (font size, panel width, toolbar height, radii) were found. The commonly quoted "11px UI type" and "240px panel" figures could not be verified. Measure them in-app if needed.
- No official Canva editor tokens were found (canvas grey hex, purple accent hex, Canva Sans sizes). The #EBECF0 canvas grey could not be confirmed; verify with DevTools on canva.com.
- Spectrum's numeric component heights, radii and platform-scale multipliers were not retrievable (the pages rendered without values, and the repo path returned 404). Researcher's recollection [unverified]: medium component height 32px on desktop and 40px on mobile, base font 14px on desktop and 17px on mobile, workflow icon 18px.
- No primary sources were found for Framer or Kittl.

## 2. Canvas workspace conventions (background, page shadow, selection, guides)

### Takeaway
No fetched source documented exact canvas colours. The conventions below are observations of shipping editors and are labelled as such.

### Cited Findings
- Canva's editor is light-themed after Glow Up. — [Small Business Trends](https://smallbiztrends.com/canva-glow-up-launched/)
- Figma's stated goal is to keep focus on the user's work, with UI that can be fully hidden. — [Figma blog](https://www.figma.com/blog/behind-our-redesign-ui3/)
- Non-text UI elements, including selection handles and focus indicators, need 3:1 contrast against adjacent colours (WCAG 1.4.11; reported via HIG/WCAG summary; the fetched Apple page did not render, so this comes from the tool's general knowledge). — [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### Inferences (observations / estimates, not documented)
- **Workspace:** a light neutral grey around the page (about #EBECF0 to #F1F2F4; Figma's light canvas is about #F5F5F5) and a dark-mode option around #1E1E1E. The page (artboard) is pure white with a soft two-layer shadow, for example `0 1px 2px rgb(0 0 0 / .06), 0 4px 16px rgb(0 0 0 / .08)`, so the page reads as paper.
- **Selection:** a 1-1.5px accent outline (Canva uses its purple/cyan family; Figma uses blue #0D99FF [unverified]) with white square or circular handles of about 8px and a 1px accent border. Make the hit area at least 24px even when the visual handle is 8px (see WCAG 2.5.8 in section 7). Handles are counter-scaled so they stay a constant screen size at any zoom.
- **Hover:** a thinner (1px) accent outline with no handles.
- **Smart guides and snapping:** a magenta or red-pink (#FF00FF-like or #F24822-like) or accent-coloured 1px line, with distance pills in the same colour.
- **Print-specific overlays:** bleed shown as a red or dashed line outside the trim, and the safe area as a dashed inner line. Both are toggled from the View menu.

### Gaps
- No primary documentation was found for Canva or Figma selection, guide or canvas hex values.

## 3. "Generic / vibe-coded" tells and how professional teams avoid them

### Takeaway
The most commonly cited tell is sameness. AI-built apps share Tailwind and shadcn defaults: an indigo/purple accent, a left-rail sidebar and a rounded card grid. Professional teams avoid it by deriving a deliberate token system (Linear: three inputs generating the whole theme in LCH), aligning everything to a grid, and restraining colour and chrome.

### Cited Findings
- AI-built apps from different tools share "the same left-rail sidebar, the same rounded card grid" and "the same bg-indigo-500 purple accent that's become the unofficial flag of AI-generated interfaces". They draw on "the same pool of Tailwind defaults and shadcn/ui components", so if you "strip the logo … you couldn't tell one app from another". (Vendor blog; opinion.) — [Banani: Vibe designing](https://www.banani.co/blog/vibe-designing)
- Advice from the same source: specify palette, typography and icon style up front, list "must avoid" patterns, and pick a reference and state how you differ. — [Banani](https://www.banani.co/blog/vibe-designing)
- Default blue-to-purple gradients are a one-line Tailwind recipe (`bg-gradient-to-r from-blue-500 to-purple-500`), which is why they proliferate. — [shadcn.io progress-gradient example](https://www.shadcn.io/examples/progress-gradient)
- Linear limited blue in its chrome for a neutral, timeless look and aligned icons and labels precisely, a detail users "feel". — [Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Figma rejected hover-reveal chrome as unstable and kept the X/Y position to protect muscle memory. Polish here means stability, not novelty. — [Figma blog](https://www.figma.com/blog/behind-our-redesign-ui3/)

### Inferences
Tells checklist, synthesised by the researcher. Avoid:
- An indigo-500 accent and purple gradients.
- Gradient text and glassmorphism everywhere.
- Emoji used as icons.
- Mixed icon sets or stroke widths.
- Borders on every card and also shadows on the same card.
- Uneven paddings (for example p-3 next to p-4) and radii not nested.
- Low-contrast grey text (`text-muted-foreground` on a grey panel failing 4.5:1).
- Every surface turned into a Card.
- Oversized marketing headings inside tool chrome.
- Unexplained "Sparkle/AI" badges.
- Long bouncy animations.
- Default shadcn spacing everywhere.
- Lorem-ipsum empty states.

Fixes:
- One accent colour and a neutral ramp generated in OKLCH.
- Separate surfaces by tone (surface levels) rather than borders.
- Use hairline (1px, low-alpha) dividers only where grouping needs them.
- An 8/4px spacing grid.
- A strict type scale of 3-4 sizes in the chrome.
- Tabular numerals.
- A single icon family at a fixed stroke.
- Real thumbnails and templates instead of placeholders.

### Gaps
- No rigorous (non-vendor) study of "AI-generated UI tells" was found. Evidence is commentary.

## 4. Motion: durations, easing, reduced motion

### Takeaway
Use 150-250ms with an ease-out (decelerate) curve for UI chrome. Keep under 300ms for frequent actions, and use no animation for keyboard-triggered actions. Animate only `transform` and `opacity`, and replace movement with a fade under `prefers-reduced-motion`. Material 3 publishes precise tokens to borrow.

### Cited Findings
- **Material 3 duration tokens:** short1-4 = 50/100/150/200ms; medium1-4 = 250/300/350/400ms; long1-4 = 450/500/550/600ms; extra-long1-4 = 700/800/900/1000ms. — [Material Components Android: Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)
- **Material 3 easing curves:**
  - standard: `cubic-bezier(0.2, 0, 0, 1)`
  - standard decelerate: `cubic-bezier(0, 0, 0, 1)`
  - standard accelerate: `cubic-bezier(0.3, 0, 1, 1)`
  - emphasized decelerate: `cubic-bezier(0.05, 0.7, 0.1, 1)`
  - emphasized accelerate: `cubic-bezier(0.3, 0, 0.8, 0.15)`
  - emphasized: a two-segment path, not a single cubic-bezier

  — [Material Components Android: Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)
- **Emil Kowalski (Sonner and Vaul author):**
  - Animations "should also usually be shorter than 300ms".
  - A 500ms entrance on something opened many times a day is too slow, and keyboard-initiated actions often need no animation.
  - Use ease-out for responsiveness.
  - Animate only `transform` and `opacity`, and use CSS or WAAPI when the main thread is busy.
  - CSS transitions are interruptible.
  - Under `prefers-reduced-motion: reduce`, swap motion for a fade (for example `fade 0.2s`), or use `useReducedMotion()` in Framer Motion.

  — [Emil Kowalski: Great animations](https://emilkowal.ski/ui/great-animations)
- **shadcn Sheet (new-york-v4) defaults:** overlay `bg-black/50` fading in and out; content `transition ease-in-out`, `data-[state=open]:duration-500`, `data-[state=closed]:duration-300`; `shadow-lg`; side sheets `w-3/4 sm:max-w-sm` with `border-l`. A 500ms open is slower than the guidance above, so shorten it for an editor's side panels. — [shadcn sheet.tsx source](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sheet.tsx)
- **Apple:** respect Reduce Motion by replacing large-scale, parallax or zoom transitions with fades or cross-dissolves. (The fetched page did not render; the summary comes from the tool's general knowledge.) — [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### Inferences
Recommended motion table:

| Interaction | Duration | Easing / notes |
|---|---|---|
| Hover and colour changes | 100-150ms | ease-out |
| Popover, dropdown, tooltip in | 150ms | `cubic-bezier(0.2, 0, 0, 1)`; scale 0.96 to 1 plus fade, from the trigger side via Radix `--radix-popover-transform-origin` |
| Popover, dropdown, tooltip out | 100ms | — |
| Side-panel slide in | 200-250ms | emphasized-decelerate |
| Side-panel slide out | 150-200ms | emphasized-accelerate |
| Toast | about 200-300ms | ease |
| Drag | none on the pointer | Objects follow the pointer 1:1. Drop and snap settle in 100-150ms. A lift shadow appears on drag start. |
| Zoom | — | Animate only for button-driven zoom steps (about 200ms). Pinch and wheel zoom are never eased. |

- Under reduced motion, collapse all of the above to opacity fades of 100ms or less.

### Gaps
- The Radix/shadcn popover default duration (tw-animate-css default 150ms [unverified]) was not confirmed this session.
- Vaul's spring and easing defaults were not documented on the snap-points page.

## 5. Onboarding: templates gallery, coach marks, sample projects, empty canvas

### Takeaway
NN/g evidence favours in-context, just-in-time cues and direct pathways over tours. For a print editor, the strongest first run is a size/template picker plus a non-blank canvas state with direct actions. If coach marks are used, limit them to one hint at the point of use.

### Cited Findings
- Coach marks are often unnecessary. Users dismiss them quickly and rarely read them. Recommendations:
  - Focus each hint on a single interaction.
  - Show hints one at a time when relevant.
  - Lead with visuals and very short text.
  - Use a single introductory modal for a complex screen rather than a series.
  - Style hints distinctly from real controls.

  Avoid:
  - Annotating every action.
  - Chains of tips, which overload memory and make the app seem complicated.
  - Wordy multi-step instructions before any interaction.

  — [NN/g: Mobile instructional overlays](https://www.nngroup.com/articles/mobile-instructional-overlay/)
- Empty states should:
  1. Communicate system status (no data, filtered, loading, error). Never show "no records" while still loading.
  2. Provide learning cues in context. These work better than forced tutorials because users can apply them immediately.
  3. Provide direct pathways (buttons and links) to key tasks, for example demo data or create actions.

  Never leave a space blank. — [NN/g: Empty states in complex apps](https://www.nngroup.com/articles/empty-state-interface-design/)
- Canva previews side-panel content on hover and pins it on click, a progressive-disclosure pattern for new users. — [Canva Help: Glow up](https://www.canva.com/help/glow-up/)

### Inferences
- **First run:** a "Choose a size" gallery (A4, A5, US Letter, business card, poster, with mm/in dimensions and real thumbnails) plus "Start blank" and "Open sample project".
- **Empty page:** a centred hint ("Drag elements here, or pick a template"), buttons for Templates, Upload and Add text, and keyboard tips in muted 12px text.
- **Coach mark:** one only, at first selection, pointing to the contextual toolbar.

### Gaps
- No Appcues or other quantitative data on template-gallery versus blank-start activation was retrieved.

## 6. Mobile and tablet editor layouts

### Takeaway
Use bottom toolbars and bottom sheets with snap points (Vaul), 44pt or 48dp targets, and native pinch-zoom handled on the canvas only.

### Cited Findings
- Vaul (the shadcn Drawer) snap points let a drawer rest partially open. `modal={false}` allows interaction with the background, `snapToSequentialPoint` disables velocity skipping, and `fadeFromIndex` controls where the overlay begins fading. — [Vaul docs: Snap points](https://vaul.emilkowal.ski/snap-points)
- Touch targets: iOS/iPadOS 44×44pt; Android Material 48×48dp; WCAG 2.2 minimum 24×24 CSS px (AA) and 44×44 (AAA). The Apple page did not render, so this comes from the tool's general knowledge and should be verified. — [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Canva Glow Up included mobile enhancements alongside the redesigned editor. — [Small Business Trends](https://smallbiztrends.com/canva-glow-up-launched/)

### Inferences
- **Under 768px:**
  - A bottom tab bar of about 56-64px with 5 tabs (Templates, Elements, Text, Uploads, More).
  - Tapping opens a Vaul sheet with snap points of about 0.4 and 0.9, non-modal at 0.4 so the canvas stays visible.
  - The contextual toolbar for a selected object becomes a horizontally scrolling row of 44px buttons above the tab bar.
  - Use `touch-action: none` on the canvas and implement pinch-zoom and two-finger pan with pointer events.
  - Set `viewport` to prevent page zoom only on the editor route.
  - Handle hit areas of at least 44px.
- **Tablet:** keep the desktop layout with a collapsible left panel.

### Gaps
- No documented Canva mobile layout dimensions were found.

## 7. Accessibility for canvas editors

### Takeaway
Treat the toolbar as an ARIA toolbar with roving tabindex. Make canvas objects focusable and keyboard-operable (arrow nudge, Tab through layers). Meet 4.5:1 for text and 3:1 for focus rings and handles, and use at least 24px targets.

### Cited Findings
- **WAI-ARIA toolbar pattern:**
  - Use `role="toolbar"` with `aria-label` or `aria-labelledby`, and `aria-orientation="vertical"` for vertical toolbars.
  - Tab enters and leaves the toolbar. On entry, focus goes to the first enabled control (optionally the last-focused one).
  - Left/Right arrows (Up/Down when vertical) move between controls. Wrapping is optional; Home and End are optional.
  - Disabled controls may stay focusable for discoverability.
  - Provide a documented shortcut to jump to the toolbar from the editing context.
  - Use a toolbar only for three or more controls. Avoid controls that consume arrow keys, or place a single such control last.
  - The example uses roving tabindex.

  — [WAI-ARIA APG: Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)
- **WCAG 2.5.8 Target Size (Minimum, AA):** at least 24×24 CSS px. Exceptions:
  - Spacing: a 24px circle centred on each target does not overlap other targets.
  - Equivalent: the same function exists in another conforming control.
  - Inline targets.
  - User-agent controls.
  - Essential presentation.

  2.5.5 (Enhanced) is the stricter criterion and is recommended for important controls. — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Contrast:** 4.5:1 for normal text (AA), 3:1 for large text and non-text UI (AA). (The tool's general knowledge, given with the Apple page.) — [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- **Linear:** contrast as a theme variable allows generated high-contrast themes. — [Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)

### Inferences
- Use the Radix `Toolbar` primitive, which implements roving tabindex.
- Focus ring: 2px accent with a 2px offset (`focus-visible:ring-2 ring-offset-2`), visible on both the canvas and panels.
- Canvas objects:
  - Tab or Shift+Tab cycle through layers.
  - Arrow keys nudge by 1 unit; Shift+Arrow nudges by 10.
  - Enter edits text; Esc deselects or exits a group.
  - Delete removes the object.
  - Announce changes via an `aria-live="polite"` region ("Text box moved to 20 mm, 35 mm").
- Mirror the canvas in a Layers panel as an accessible list or tree.
- Check that muted text greys reach 4.5:1 on the panel background.

### Gaps
- No primary-source guidance specific to canvas-editor keyboard models was retrieved (beyond ARIA APG). WCAG 2.4.13 Focus Appearance specifics were not fetched.
