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
- "Start each H1 on a new page" toggle on the H1 size row.
- `---` horizontal rules start a new page (on by default, can be turned off).
- Header text and page number format, with `{{title}}`, `{{page}}`, `{{pages}}` tokens.
- Code font and size.

### Needs verification in Obsidian
- `---` page breaks, and the global heading font with per-level overrides (built, not yet exported in the app).

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
- Full app CSS hides content when printed, so only a filtered set of rules is copied. New Obsidian theme rules may need to be added to the filter.
- Printing waits a fixed 500 ms after load. A load-complete signal would be more reliable.
- Settings for page size and margins are not yet previewed live.
- Mobile support depends on how Obsidian mobile exposes printing.
