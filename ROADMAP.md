# md-to-pdf Roadmap

Goal: export Obsidian notes to PDFs that match the reading preview exactly, including custom code-block renderers such as BRNotation, with fine control over page layout, typography, headers and footers, and structure.

## Status

### Done
- Render a note with Obsidian's `MarkdownRenderer` and capture the DOM.
- Wait for async post-processors to settle before capture.
- Capture canvases and inline images.
- Inject app CSS, theme variables, and BRNotation's bundled music fonts.
- Export through Electron `printToPDF`, with headers and footers.
- BRNotation staff elements (clef, time signature, noteheads, stems, beams) export correctly.
- Page setup: size, orientation, margins.
- Body text: font, size, line height, paragraph spacing.
- Global heading font, with per-level override switches (H1, H2, H3), and heading sizes and spacing.
- Heading and body weight per level, with no forced bold. Bundled families choose weight and italic with radio buttons in their previews.
- Font previews render each face at the chosen point size, labeled (regular, bold, italic, and so on). Bundled fonts load into the settings page.
- League Gothic and League Gothic Condensed are bundled (SIL OFL 1.1).
- Settings page keeps its scroll position when a setting changes.
- Theme preview tab: a Lorem Ipsum sample (H1–H6, text, lists, quote, code, table) that uses the export CSS and current settings.
- "Start each H1 on a new page" toggle on the H1 size row.
- `---` horizontal rules start a new page (on by default, can be turned off).
- Header text and page number format, with `{{title}}`, `{{page}}`, `{{pages}}` tokens.
- Code font and size.
- Bundled font collections: TeX Gyre (8 families) and League of Moveable Type (all families, including League Gothic). One grouped font dropdown for all fonts.
- Themes: save, load, and delete named style presets, and reset to defaults. Stored in plugin data.

### Needs verification in Obsidian
- `---` page breaks, and the global heading font with per-level overrides (built, not yet exported in the app).
- Bundled fonts in the export: TeX Gyre and League families render in the PDF, and the preview line in settings updates.
- Themes: save, load, delete, and reset, including heading weights and italics.
- Export with per-level heading weights, and the theme preview tab's sample against the PDF output.

## Next

### 1. Preview pane
- Custom `ItemView` that shows the paginated PDF output beside the note.
- Debounced auto-refresh, plus a manual refresh command.
- Show page breaks.

### 2. Table of contents
- Generated from headings, with a configurable depth range.
- Clickable links.
- Page numbers, computed with a two-pass render (first pass reads heading positions, second pass writes them).
- Optional PDF outline (bookmarks).

### 3. Frontmatter and cover page
- Optional cover page built from `title`, `author`, `date`, `version`, and similar keys.
- Frontmatter is hidden from the body.
- Per-note overrides through frontmatter keys (for example, `pdf-page-size`).

### 4. Rendering fidelity
- Wikilinks and `![[embeds]]`: convert to internal PDF links or transcluded content.
- Audit other custom renderers (Mermaid, MathJax, Dataview) against the preview.

## Later

### 5. Mobile export
- Default: print-ready HTML, sent through the share sheet or system print. Headers and page counters are not available here.
- Optional setting: a pure-JavaScript PDF renderer (pdfmake or jsPDF). Lower fidelity; custom blocks such as BRNotation may not render.

### 6. Presets and batch export
- Named style presets with JSON import and export.
- Export a folder or a selection, merged into one PDF.

### 7. Quality
- README covering settings, supported renderers, and limitations.
- A sample vault for manual testing.
- Automated tests for the document builder (settings to CSS) and the pagination logic.

## Known issues and open questions
- TeX Gyre Chorus is not bundled. The archive only has its medium italic face.
- Bundled fonts are read from the plugin folder at export time. Only fonts used by the note are embedded in the PDF.
- Full app CSS hides content when printed, so only a filtered set of rules is copied. New Obsidian theme rules may need to be added to the filter.
- Printing waits a fixed 500 ms after load. A load-complete signal would be more reliable.
- Settings for page size and margins are not yet previewed live.
- The H1 sample in the theme preview is shown at its real point size, which may be large inside the settings panel.
- Settings page scroll preservation depends on Obsidian's settings container class. Confirm it in Obsidian.
- Mobile support depends on how Obsidian mobile exposes printing.
