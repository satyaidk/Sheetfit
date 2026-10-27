# Canva editor structure and interaction model (2024-2026), for replication in a React/Konva A4 print-layout editor

Method note: canva.com help pages block WebFetch (HTTP 403) but are served to a browser user agent; they were downloaded with curl on 2026-10-27 and read as text. Every item under "Cited Findings" comes from a page that was actually read, or, where marked, from a search-result summary only. Pixel sizes for Canva's chrome (header height, rail width, and so on) are NOT documented anywhere I could find. Estimates appear only under "Inferences" and are labelled as unverified.

## 1. Overall layout: header, left object panel, canvas, bottom bar

### Takeaway
The current ("glow up") editor has a header with a File menu, Resize, a mode switcher and Share. Below it, on the left, sits a light-themed "floating" side panel: an icon rail whose tabs open on hover, pin on click and close with an X. The canvas takes the centre. A contextual "quick actions" toolbar replaced the old fixed toolbar under the header, and a page/zoom footer offers scroll, thumbnail and grid views. Canva's stated aim is "more space to create" and to "make your content the hero".

### Cited Findings
- The glow-up editor has "a light-themed, redesigned 'floating' object panel with all your most relevant tabs at your fingertips, customized to whatever type of design you're in". The interface is "designed to make your content the hero". — [Canva Newsroom, glow up](https://www.canva.com/newsroom/news/glow-up/)
- Canva says of the new layout: "There's more space to create and work, and nothing gets in your way – increasing focus and reducing overwhelm". Extra features sit in a "'more' section". — [Canva Newsroom, glow up](https://www.canva.com/newsroom/news/glow-up/)
- Side panel behaviour: "Hover over the tab to quickly access content or click on the tab to pin the panel open. To close the side panel, tap the tab again or click the close button." The panel still gives access to "templates, elements, fonts, Brand Kit, Draw, Projects folder, and Apps". — [Canva Help, Get to know the glowed up editor](https://www.canva.com/help/glow-up/)
- Top-left menu icon: it opens the homepage menu without leaving the editor. A close icon appears when you hover near the Canva logo. — [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)
- Mode switcher: the header offers Editing, Commenting and Viewing in every design type, plus Suggesting in Docs. On mobile it is under the header's "more" icon. — [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)
- The comment panel is a dedicated sidebar that can be expanded or hidden, with filter and sort. — [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)
- The top bar is called the "menu bar" or "editor menu bar". Items referenced in help articles:
  - **File**, which contains Settings (Show margins, Show print bleed, Show danger zone detection), "Rulers and guides" and Version history.
  - **Resize**.
  - **Share**, which leads to Download, with file type "PDF Print" and a "Crop marks and bleed" checkbox.
  — [Canva Help, margins/bleed/rulers](https://www.canva.com/help/margins-bleed-crop-marks/); [Canva Help, Resize designs](https://www.canva.com/help/resize/)
- Side pane shortcut: Ctrl + / toggles the side pane open or closed. Ctrl+F1 focuses the editor toolbar, Ctrl+F2 the canvas and Ctrl+F3 the side panel. Ctrl+F6 and Shift+Ctrl+F6 cycle through surfaces. — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Page views:
  - Scrolling view: Alt+Ctrl+1.
  - Thumbnail view: Alt+Ctrl+2.
  - Grid view: Alt+Ctrl+3.
  - Presentation mode: Alt+Ctrl+P.
  - Go to page: Alt+Ctrl+G.
  - Add empty page: Ctrl+Enter.
  - Delete empty page: Ctrl+Backspace.
  — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Zoom:
  - Zoom in / out: Ctrl + `+` and Ctrl + `-`.
  - Actual size: Ctrl+0.
  - Zoom to fit: Alt+Ctrl+0.
  - Zoom to fill: Shift+Ctrl+0.
  — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Visual Suite 2.0 (April 2025) merged docs, presentations and websites into one design format. It also added a bar below the canvas that shows other formats the project can take. (This is from a search-result summary only; I could not open the article.) — [Fast Company, Canva's biggest redesign in 13 years](https://www.fastcompany.com/91313361/canva-unveils-its-biggest-redesign-in-13-years)
- Designs now open in a new browser tab by default. You can change this under Settings > Your profile > Link opening. — [Canva Help, Design from scratch](https://www.canva.com/help/design-from-scratch/)

### Inferences
- For our app: a three-zone shell.
  - **Header:** file/settings menu, Resize/Sheet size, undo/redo, editable title, Download as the primary button.
  - **Left:** an icon rail plus one expandable panel. Hover previews the panel, click pins it, and Ctrl+/ toggles it.
  - **Centre:** the canvas.
  - **Footer:** zoom percentage, a fit button, a page thumbnail strip and a grid-view toggle.
  - The contextual toolbar floats above the canvas rather than sitting in a fixed second header row.
- Unverified size estimates from general familiarity with the product. Not measured; treat them as starting points only:
  - Header about 56px tall.
  - Icon rail about 72px wide, with icon-over-label tabs.
  - Expanded panel about 360px wide.
  - Footer about 48px tall.
  - Contextual toolbar about 40-48px tall.
- The "rotating sidebar" wording in the newsroom post refers to the homepage, not the editor.

### Gaps
- No official or measured pixel dimensions exist for the header, rail, panel or footer. This needs a screenshot measurement in a live browser.
- I could not confirm the exact current tab list and order in the rail. The help page lists the content types, not the labels. The Notes, Timer and zoom-slider footer items could not be confirmed from a page I read.

## 2. Contextual toolbar, floating toolbar, "more" and right-click menus

### Takeaway
There are two contextual surfaces.
- **Quick-actions toolbar:** above the canvas, and its contents depend on the selection type. A `>>` button expands it into a full "Edit panel". It holds tools such as Position, Transparency and crop/effects.
- **Floating toolbar:** sits next to the selection and holds Group/Ungroup, Edit (for pages) and a "More" (`...`) button.

Right-click opens the same "More" menu: copy/duplicate/delete/lock/layer/"Resize canvas to Selection" and similar.

### Cited Findings
- "The fixed toolbar below the header is now in a quick actions toolbar. Just select an element and it'll suggest relevant editing options. If you select an image, it will present photo editing tools like cropping, filters, and effects. Select any text, and it will show font, size, and style. To view all the editing features, click the >> button at the end of the bar and the edit panel will open." — [Canva Help (AU), glowed up editor](https://www.canva.com/en_au/help/glow-up-variantb/)
- The Edit panel "opens after selecting an option or tool or expanding the toolbar. The features you'll see depend on the editing options available for the selected element." It closes with an X. — [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)
- Position lives on "the toolbar above the editor". If it is not visible, you first click the overflow button. — [Canva Help, Group, layer, and align](https://www.canva.com/help/layer-group-align/)
- Transparency is also on "the toolbar above the editor". It is a slider plus a numeric field, works on multi-select (Shift+click), and also appears inside the colour flyout for solid fills. — [Canva Help, Adjust element transparency](https://www.canva.com/help/transparency/)
- Group and Ungroup are on "the floating toolbar". Clicking a group selects the group, and clicking again selects a child, which can then be resized, rotated or moved while the group stays intact. — [Canva Help, Group, layer, and align](https://www.canva.com/help/layer-group-align/)
- Page edit: select the page background or its thumbnail, then choose Edit on the floating toolbar to open the "Edit Page panel", which includes Resize for that page alone. — [Canva Help, Resize designs](https://www.canva.com/help/resize/)
- "Resize canvas to Selection": right-click the selection, or choose More, to fit the page to the selected elements' bounding box. The elements stay in place. — [Canva Help, Resize designs](https://www.canva.com/help/resize/)
- Apps content: "right-click the content, select Download selection". — [Canva Help, Group, layer, and align](https://www.canva.com/help/layer-group-align/)
- Shortcuts:
  - Quick actions: `/` or Ctrl+E.
  - Open the More actions menu for the selection: listed as "Shift + 10", which is most likely Shift+F10.
  - Show layers: Alt+1.
  — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Third-party (search summaries only):
  - Right-click gives "a fuller menu offering duplication, locking on the page, and front/back layering".
  - Lock has two modes, "lock the whole text box or only its position".
  - On mobile, more actions sit behind a "more" icon on the floating toolbar, or a long press.
  — [Technology 4 Learning, NSW](https://t4l.schools.nsw.gov.au/resources/professional-learning-resources/canva-for-education/canva-foundations/transcriptcanvaeditingtools.html); [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)

### Inferences
- Replicate it as follows:
  - **(a)** A single contextual bar keyed by selection type:
    - Image: Replace/Edit image, Crop, Flip, Transparency, Position.
    - Text: Font, Size, Colour, Bold/Italic, Align, Spacing, Transparency, Position.
    - Multi-select: Align elements, Space evenly/Tidy up, Group, Transparency, Position.
    - Page/background: Background colour, Resize, Margins/Bleed toggles.
  - **(b)** A small floating pill above or below the selection bounding box with Duplicate, Delete, Lock, Group (when multi-selected) and `...`.
  - **(c)** A right-click menu that mirrors `...`, as in this exact list:

    ```
    Copy / Paste / Duplicate / Delete
    ---
    Layer > (Forward, Backward, To front, To back)
    Align to page >
    ---
    Group/Ungroup, Lock
    ---
    Resize canvas to selection
    ```
- This follows the pattern seen in Canva. It is not a verbatim transcription of Canva's current menu.

### Gaps
- I did not find a verbatim, current list of Canva's right-click menu items. The candidates seen in sources are Copy, Paste, Duplicate, Delete, Lock, Layer, Align to page, Comment, Link, Alternative text, Resize canvas to Selection and Download selection, but no single source confirms the full list or its order.
- Exact per-element toolbar item order (for example "Edit image | Crop | Flip | Animate | Position") was not available from a page I read.

## 3. Position panel (Arrange / Layers) and Resize / custom dimensions

### Takeaway
Position opens a side panel with two tabs.
- **Arrange:** Forward/Backward/To front/To back. Align to page applies to a single element; Align elements applies to a multi-selection.
- **Layers:** a list of layers on the current page with drag-to-reorder, an insertion line, Shift multi-select and a per-row "more" menu.

Resize (Magic Resize) offers suggestions, categories, a custom size with unit choice and an aspect lock, plus "Copy & resize" or "Resize this design".

### Cited Findings
- The Position panel has Arrange and Layers tabs. Layer options are "Forward, Backward, To front, or To back. Options may differ depending on the order of layers." — [Canva Help, Grouping, layering, aligning (canva.cn mirror)](https://www.canva.cn/en/help/layer-group-align/); [Canva Help](https://www.canva.com/help/layer-group-align/)
- Alignment rules: "Align to page" appears when only one element is selected and uses the page as the reference. "Align elements" appears for multi-selection and uses the selected elements' positions. — [Canva Help, Group, layer, and align](https://www.canva.com/help/layer-group-align/)
- Layers tab details:
  - It shows layers on the current page.
  - Grouped layers have a group icon, and the page background has a background icon.
  - Selecting a row highlights the element on the page.
  - On hover, a "more options" icon appears on the row.
  - You reorder by dragging up or down, and "a line will indicate where it will be inserted".
  - Multiple layers can be selected with Shift and dragged together.
  — [Canva Help, Finding and arranging layers](https://www.canva.com/help/finding-and-arranging-layers/)
- Arrange shortcuts:
  - Forward: Ctrl+].
  - Backward: Ctrl+[.
  - To front: Alt+Ctrl+].
  - To back: Alt+Ctrl+[.
  - Tidy up: Alt+Shift+T.
  - "Justify elements-level": Ctrl+Shift+J.
  - Group: Ctrl+G. Ungroup: Ctrl+Shift+G.
  - Lock: Alt+Shift+L.
  — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Resize flow:
  - Editor menu bar, then Resize.
  - Choose from suggestions or "Browse by category" (multiple sizes allowed).
  - "Custom size" with lock/unlock aspect ratio.
  - Choose pages.
  - "Copy & resize" or "Resize this design".
  - Suggested bundles exist (for example "Vertical videos", "Your last selection") and are customisable with checkboxes.
  - Magic Resize is a paid feature that counts against AI usage limits.
  — [Canva Help, Resize designs and size limits](https://www.canva.com/help/resize/)
- Custom size units: "px, in, mm, or cm". Limits are a minimum of 40 x 40 px and a maximum of 8000 x 3125 px. Fields outside the limits "turn red", and a message with the limits appears after Enter or blur. — [Canva Help, Design from scratch](https://www.canva.com/help/design-from-scratch/); [Canva Help, Resize](https://www.canva.com/help/resize/)
- Resize is undone through File > Version history, not Undo, unless it was "Copy & resize". The exception is "Resize canvas to Selection", which uses Undo. — [Canva Help, Resize](https://www.canva.com/help/resize/)
- Magic Switch transforms Docs into presentations and other formats; Magic Resize is not supported in Docs. — [Canva Help, Resize](https://www.canva.com/help/resize/)

### Inferences
- For an A4 sublimation/DTF tool:
  - Offer a "Sheet size" dialog modelled on Resize: presets (A4, A3, Letter, custom roll width) plus Custom with a unit dropdown (mm default, then cm/in/px), an aspect lock, red-field validation with min/max shown on blur, and "Apply to this sheet" vs "Duplicate as new size".
  - Reuse the Layers-tab pattern exactly: a reverse-z list, a type icon per row, hover "more", a drag insertion line and Shift multi-select.

### Gaps
- No source documented the numeric "Advanced" fields (W/H/X/Y/rotation) in the Arrange tab. They exist in the live product as far as I know, but no page I read confirms them.

## 4. Smart guides, snapping, nudging and transform feedback

### Takeaway
Officially documented:
- Arrow-key nudge: small step, or a large step with Shift.
- Ctrl+Arrow keyboard resize, Alt+, and Alt+. keyboard rotate, and F2 to toggle proportional vs single-axis resize.
- Rulers (Shift+R) with draggable guides and a lockable guide set.
- A grey ruler highlight that shows the element's extent while dragging.
- Snapping to the danger-zone edge.

The colours of the smart guides and spacing indicators are not documented officially.

### Cited Findings
- Nudge: Arrow keys move a small step and Shift+Arrow a large step. Ctrl+Arrow resizes a small step and Shift+Ctrl+Arrow a large step. Rotation is Alt+, and Alt+. (small), or Alt+Shift+, and Alt+Shift+. (large). F2 toggles "between proportional and single-axis resize". Tab and Shift+Tab select the next or previous element. Shift+W/A/S/D adds the closest element above/left/below/right to the selection. F8 toggles multi-select mode. — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Rulers and guides:
  - Shift+R shows rulers and guides, and Alt+Ctrl+; locks guides.
  - Rulers appear at the top and left and show the design's unit (a px design shows px rulers).
  - "Gray highlight on the rulers will appear when you select and move an element".
  - Guides are added by dragging from the rulers.
  - Rulers are desktop only.
  — [Canva Help, margins/bleed/rulers](https://www.canva.com/help/margins-bleed-crop-marks/); [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Print guides:
  - Show margins draws a border of broken lines.
  - Show print bleed draws dashed lines near the edges, with a fixed 0.125 in (3.175 mm) bleed.
  - Danger-zone detection shows a red overlay when an element enters the danger zone. "You can snap elements to the edge to make sure they stay in the safe area."
  - Crop marks appear only in the PDF Print export.
  — [Canva Help, margins/bleed/rulers](https://www.canva.com/help/margins-bleed-crop-marks/)
- Canva states that an A4 design with bleed exports at about 222 x 309 mm, with a printable area of 216 x 303 mm. — [Canva Help, margins/bleed/rulers](https://www.canva.com/help/margins-bleed-crop-marks/)
- Third-party, low-authority, unverified claims:
  - Holding Ctrl/Cmd while dragging temporarily disables snapping.
  - A "Show smart guides" toggle exists under preferences.
  — [Trupeer tutorial](https://www.trupeer.ai/tutorials/how-to-turn-off-snapping-in-canva); [WebsiteBuilderInsider](https://www.websitebuilderinsider.com/how-do-i-turn-off-guidelines-in-canva/)

### Inferences
- Implement:
  - Snapping to page edges, page centre, other elements' edges and centres, guides, margins and the bleed line, with a snap threshold of about 5-8 screen px (independent of zoom).
  - Equal-spacing indicators as short segments with distance labels.
  - A dimension pill (W x H in the sheet unit) while resizing, and an angle pill while rotating.
  - An Alt/Ctrl modifier to suppress snapping.
  - Arrow keys = 1 unit; Shift = 10 units (a common convention). Canva documents "small" and "large" steps without values.
  - Konva gives the hooks for this: `dragBoundFunc` / `Transformer.anchorDragBoundFunc`, plus Transformer `rotationSnaps` (for example every 45 deg) and `rotationSnapTolerance`.
- Canva's guide lines are widely described as magenta/pink, but I found no citable hex. Using the app's accent colour (for example magenta `#FF00C8`-ish or purple) is a design choice, not a documented Canva value.

### Gaps
- Exact nudge step values, guide-line colour, the spacing-indicator style and the snap tolerance are not documented in any source I could access.

## 5. Uploads panel

### Takeaway
The Uploads tab sits in the side panel. It has an "Upload files" button (with a split option for "Upload folder"), drag-and-drop from the OS onto the tab, click-to-add to the design, sub-tabs by media type plus a Folders tab, and a hover corner menu on each item (Move to folder and so on).

### Cited Findings
- To upload: "On the editor side panel, select the Uploads tab. Click Upload files. To upload a folder, select [the more icon] and select Upload folder... You can also drag them from your computer folder to the Uploads tab. To use your upload in your design, click on it from the side panel." — [Canva Help, Upload media from your device](https://www.canva.com/help/upload-media/)
- Folders live in a Folders tab with "Create folder" (name plus team sharing). Hovering a file shows a corner icon with "Move". Folder actions are Details, Share and Delete. "Uploading large batches of files may cause errors"; folder upload is not available on mobile. — [Canva Help, Upload media](https://www.canva.com/help/upload-media/)
- Storage: Free 5 GB, Pro 100 GB, Business 500 GB, Teams 1 TB, Enterprise 1-5 TB. Free users are notified at 80%. — [Canva Help, Upload media](https://www.canva.com/help/upload-media/)

### Inferences
- For the print tool:
  - A drop zone covering the whole Uploads panel, plus a canvas-level drop target that places the image at the drop point.
  - Optimistic thumbnails with per-item progress rings.
  - A masonry grid.
  - Click-to-add at page centre, drag-to-place, and a hover corner `...` menu (Delete, Duplicate to sheet, Show DPI info).
  - A DPI/quality badge is a sensible addition for print and is not something Canva documents here.

### Gaps
- No official description of the upload progress UI or the thumbnail grid dimensions was found.

## 6. Templates/elements browsing, empty states, onboarding, shortcuts list

### Takeaway
The documented pieces are a "Create a design" quick-create flow, searchable design types and a large shortcut set: a single-key insert (T, R, L, C, S) plus a quick-actions command palette (`/` or Ctrl+E). Carousel and "See all" browsing patterns and the first-run onboarding were not documented in pages I could read.

### Cited Findings
- Single-key inserts: T = text, R = rectangle, L = line, Shift+\ = elbowed line, C = circle, S = sticky note. Ctrl+K adds a link. — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Quick actions command palette: `/` or Ctrl+E. — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Text shortcuts include:
  - Font menu: Shift+Ctrl+F.
  - Bold, italic, underline: Ctrl+B, Ctrl+I, Ctrl+U.
  - Uppercase: Shift+Ctrl+K.
  - Align: Shift+Ctrl+L, Shift+Ctrl+C, Shift+Ctrl+R.
  - Font size +/-1: Shift+Ctrl+. and Shift+Ctrl+,.
  - Copy and paste text style: Alt+Ctrl+C and Alt+Ctrl+V.
  — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- General: Ctrl+D duplicates and Backspace or Delete deletes. Undo is Ctrl+Z; redo is Ctrl+Y or Shift+Ctrl+Z. Save is Ctrl+S and Print is Ctrl+P. — [Canva Help, keyboard shortcuts](https://www.canva.com/help/keyboard-shortcuts/)
- Canva keeps a Design School "Canva editor shortcuts cheatsheet", last updated 08 Oct 2026. The content is an image/PDF and was not readable as text. — [Canva Design School](https://www.canva.com/design-school/resources/canva-editor-shortcuts-cheatsheet)
- Quick create: "Click Create a design then select or search for a template", including starred and Brand Templates. — [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)

### Inferences
- Implement a `?` / Ctrl+/ shortcut sheet modelled on Canva's sections: Basic, Element, Text, Zoom, Page view.
- Add a `/` command palette.
- The empty sheet should show a centred, dashed drop prompt ("Drop images here or click Upload") that disappears after the first element.

### Gaps
- Template carousel layout, "See all" behaviour, card hover states and first-run tips were not found in readable official sources.

## 7. Mobile/tablet behaviour

### Takeaway
On mobile, the side-panel tabs become a retractable bottom drawer. The selection toolbar is a bottom toolbar that changes with the selected element and scrolls horizontally, with "More" at the end. Long press opens more actions, and text editing adds a keyboard toolbar. Rulers and folder upload are desktop only.

### Cited Findings
- "To view more, swipe left and tap More. You may also tap [more icon] from the floating toolbar, or long press on the element." — [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)
- Keyboard toolbar: in text edit mode, a toolbar above the keyboard offers font, colour and size. Swipe left for more. Choosing a tool closes the keyboard to show its options, an up-arrow expands the menu, and X returns to the toolbar. — [Canva Help, glowed up editor](https://www.canva.com/help/glow-up/)
- The iOS bottom toolbar "changes based on the selected element… only actions relevant to the current selection are displayed". The critique notes that advanced actions (Lock, Layer order) are buried in secondary menus. (Search-result summary only.) — [Pratt IXD, Design Critique: Canva iOS (Feb 2026)](https://ixd.prattsi.org/2026/02/design-critique-canva-ios-app/)
- Rulers are not available on mobile, and neither is folder upload. — [Canva Help, margins/bleed/rulers](https://www.canva.com/help/margins-bleed-crop-marks/); [Canva Help, Upload media](https://www.canva.com/help/upload-media/)

### Inferences
- Below about 768px:
  - Collapse the rail into a bottom tab bar that opens bottom sheets with half and full detents.
  - Move the contextual toolbar to a horizontally scrolling bottom strip.
  - Use long-press for the context menu.
  - Keep touch targets of 44px or more.

### Gaps
- No measured mobile dimensions or tablet-specific layout details were found.

## 8. Visual style: colour, type, radii, shadows, spacing, selection

### Takeaway
- **Colour:** the brand is a purple-to-teal gradient (the logo uses #7D2AE7, #6420FF and #00C4CC), and the editor chrome is light and neutral.
- **Type:** Canva Sans has been the custom typeface since August 2024.
- **Spacing and radii:** the official App UI Kit spacing scale is 4/8/12/16/24/32/48/64/96 px, with radii of 4px (sharp) and 8px (default).
- **CTA purple:** a third-party sample reads #8B3DFF for the button purple. This conflicts with the brand-purple sources.
- **Selection:** the selection outline colour and handle shapes are not officially documented.

### Cited Findings
- The App UI Kit (Canva's official component library for apps inside the editor) spacing tokens are 0, 4, 8, 12, 16, 24, 32, 48, 64 and 96 px:

  | Token | Value |
  |---|---|
  | `--ui-kit-space-050` | 4px |
  | `--ui-kit-space-1` | 8px |
  | `--ui-kit-space-150` | 12px |
  | `--ui-kit-space-200` | 16px |
  | `--ui-kit-space-300` | 24px |
  | `--ui-kit-space-400` | 32px |
  | `--ui-kit-space-600` | 48px |
  | `--ui-kit-space-800` | 64px |
  | `--ui-kit-space-1200` | 96px |

  Radii are `--ui-kit-radius-element-sharp` 4px and `--ui-kit-radius-element` 8px. A 44px value also appears on that page, in a context I could not resolve (likely a touch-target or element height). — [canva.dev, App UI Kit spacing](https://canva.dev/docs/apps/app-ui-kit/spacing)
- The App UI Kit colour tokens are semantic: action primary/secondary/tertiary/overlay/selected (bg, bg-hovered, bg-pressed, fg, border) plus feedback positive/info/warn/critical, each with dark and light theme values. The hex values are rendered as swatches and were not extractable as text. Tokens also exist for Shadows, Transitions and Units. — [canva.dev, App UI Kit colors](https://canva.dev/docs/apps/app-ui-kit/colors)
- The Canva logo SVG on canva.dev uses gradient stops #00C4CC, #6420FF and #7D2AE7. The wordmark fill is #0E1318. — [canva.dev page source](https://canva.dev/docs/apps/app-ui-kit/colors)
- The August 2024 brand refresh introduced the custom Canva Sans typeface, sharpened the gradient palette and simplified colours to meet AA accessibility. — [Business Wire, Canva Unveils Refreshed Brand (Aug 2024)](https://www.businesswire.com/news/home/20240808572035/en); [eCommerceNews AU](https://ecommercenews.com.au/story/canva-launches-global-brand-system-to-boost-workplace-design); [brandkit.pro](https://brandkit.pro/brand/canva)
- Brand purple sources disagree:
  - brandkit.pro gives Canva Purple #7D2AE7 and Teal #00C4CC.
  - A third-party "DESIGN.md" token sample gives a brand/CTA purple of #8B3DFF.
  - The same sample gives text #0D0E10, surface #F5F5F5, border #E7E7E7, soft text #5B5C60 and soft border #F0F0F0.
  - It also gives radii of 4px for icon controls, 8px for buttons and inputs, 12px for cards and pills for filters.
  - Its motion timings are 150ms for hover, 240ms for panels and 320ms for preview.
  - Its type scale is Canva Sans: 14px body-sm, 13px label w500 and 12px caption.

  The DESIGN.md sample is a third-party approximation and is not authoritative. — [brandkit.pro](https://brandkit.pro/brand/canva); [webdesignhot DESIGN.md: Canva](https://www.webdesignhot.com/design.md/canva/)
- The glow-up editor chrome is "light-themed", "lighter, fresher". — [Canva Newsroom, glow up](https://www.canva.com/newsroom/news/glow-up/)

### Inferences
- A practical token set for the editor, which mixes official spacing/radii with third-party colours:
  - Background #FFFFFF, with a panel or canvas backdrop of about #F5F5F5 (Canva's canvas backdrop is a light grey).
  - Text #0D0E10, secondary text #5B5C60 and borders #E7E7E7.
  - Accent purple #8B3DFF for the primary button, selection and active tab. Alternatively use #7D2AE7 to match the logo.
  - Teal #00C4CC as the secondary accent.
  - An 8px spacing grid, 8px control radius, 12px card radius and 4px small-control radius.
  - Font: Canva Sans is proprietary, so substitute a geometric sans such as "Inter", "Plus Jakarta Sans" or "DM Sans".
  - Toolbars and floating menus: white with a 1px #E7E7E7 border and a soft shadow (about `0 2px 8px rgba(0,0,0,.08)` for floating elements, stronger for popovers).
- Selection styling (unverified, from general familiarity):
  - A thin purple/violet outline (about 1.5-2px).
  - White circular corner handles with a grey or purple stroke.
  - Pill-shaped side handles for single-axis resize.
  - A circular rotate handle below or above the element.
  - Konva Transformer settings that approximate this:

    ```
    borderStroke: accent, borderStrokeWidth: 1.5
    anchorFill: '#fff', anchorStroke: '#c4c4c4'
    anchorCornerRadius: 999
    anchorSize: 10
    ```

    Pill side anchors need `anchorStyleFunc` to set different width and height per anchor name (`middle-left`, `top-center` and so on).
  - `rotateAnchorOffset` about 24-30.

### Gaps
- No official hex for the editor's selection outline, guides, hover states or CTA purple. App UI Kit hex values were not extractable as text and would need to be read from the npm package's CSS (`@canva/app-ui-kit` styles).
- The handle shapes (round corners, pill sides) could not be confirmed from a citable 2024-2026 source.
