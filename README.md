# md-to-pdf

An Obsidian plugin that exports Markdown notes to beautifully laid-out PDF files.

The export renders the note with Obsidian's own markdown renderer, so custom code block renderers (such as BRNotation) appear in the PDF as they do in preview.

## Status

Early development. Export works for body content, page setup, typography, headers, and page numbers. BRNotation staff notation is still being refined. See [ROADMAP.md](ROADMAP.md) for planned work.

### Fonts

The font menu lists the system stacks, then two bundled collections:

- **TeX Gyre**: Adventor, Bonum, Cursor, Heros, Heros Condensed, Pagella, Schola, Termes. Licensed under the GUST Font License (`assets/fonts/tg/LICENSE-GFL.txt`).
- **League of Moveable Type**: all families in the collection, licensed under the SIL Open Font License 1.1 (`assets/fonts/league/LICENSE-OFL.txt`). See `assets/fonts/league/NOTICE.md` for copyright notices.

- **League Gothic** and **League Gothic Condensed**: included under the same license.
- **Google Fonts**: Libre Franklin, Archivo, Archivo Condensed, Oswald, Pathway Gothic One, and Barlow. Licensed under the SIL Open Font License 1.1 (`assets/fonts/google/LICENSE-OFL.txt`). Variable fonts are shipped as static instances at the weights listed in `assets/fonts/google/NOTICE.md`.

TeX Gyre Chorus is not bundled because the archive only includes its medium italic face.

Set page margins in mm, cm, inches, points, or picas with the **Margin unit** dropdown. Values are stored in mm, so changing the unit only changes how they are shown.

Font sizes, the baseline grid unit, and paragraph spacing each have a value and a unit dropdown. Spacing can be given in **em**, **pt**, **pc**, **in**, **cm**, or **mm**. Font sizes and the grid use absolute units. Values are converted to the stored unit when saved, so changing the dropdown does not change the output.

### Paragraph styles

The **Paragraph styles** section works like InDesign's Paragraph Styles panel. It lists the built-in styles: Body, H1–H6, Block quote, List item, Code block, Inline code, Link, Bold, Italic, Table, Horizontal rule, Callout, Image, and Footnote. Link, Bold, Italic, Table, Horizontal rule, Callout, Image, and Footnote inherit from Body until you change them. Click a style to edit it. Notes stay plain Markdown, so the set of styles is fixed.

Each style has a **Based on** dropdown. A style uses the values of its base for any property it does not override. An overridden value shows a reset icon. Inherited values show "Inherited from" with the name of the base style. **Reset all to based-on style** clears every override for the selected style.

Each style has these settings. Each group folds open and closed, and all groups start folded:

- **Character**: size, font, style (the faces the typeface ships), small caps, all caps, ligatures, and oldstyle figures (checkboxes).
- **Paragraph**: alignment (left, center, right, or justify), text wrap (`text-wrap: pretty` or `balance`), hyphenation, justify between characters (`text-justify: inter-character`, which needs Chromium 145 or later), and page break before. Page break before works on any block style (body text, headings, blockquotes, list items, and code blocks); inline code cannot take one.
- **Spacing**: line height, space before, and space after. Each has a value and a unit dropdown.

The font field opens a menu grouped into System fonts, TeX Gyre, and League of Moveable Type. Each entry is drawn in its own font with a sample line, so you can compare fonts before picking one. Bundled fonts load when the menu opens.

The baseline grid and the hyphenation language apply to the whole document. They are in the same section.

- **Baseline grid**. When enabled, body and heading line heights are whole multiples of the grid unit (in pt), block spacing snaps to half units, and each block's first baseline is moved onto a grid line. The first line of every page (including pages that start after a page break or `---` rule) has its cap height on the top margin, or on the first grid line below it when the grid is on. Layout is measured in the printed column width, so line breaks match the PDF.
- **Overflow page breaks**. A block whose first line would fall past the bottom margin moves to the next page, as if it had a forced break.
- **Known gap**: a paragraph split across pages does not yet align its continuation line to the top margin. The continuation starts a few points below the margin. Whole blocks that move to a new page are aligned correctly.

Hyphenation and justification are applied by Chromium's print engine, so they show in exported PDFs.

### Non-breaking spaces

Turn on **Non-breaking spaces** to keep short words, numbers, and section marks attached to the next word, so "§ 4", "12 pt", and "Fig. 3" don't split across lines. This uses [typograf](https://github.com/typograf/typograf) with only its non-breaking-space rules. Text in code, links, and math is left alone.

### Smart quotes

Smart quotes are on by default. They turn straight double quotes into curly ones and straight apostrophes into ’. This uses typograf's quote and apostrophe rules. Single-quote pairs such as `'fine'` are not converted, so they stay straight. Text in code, links, and math is left alone.

### Blank lines

Put `<linespace N unit>` on its own line to add an empty space of that height, for example `<linespace 2 em>` or `<linespace 0.5 in>`. Angle brackets are used because square brackets become links in Obsidian. Units are em, in, pt, pc, cm, or mm. The space shows in both the preview and the PDF. Lines inside code blocks are not changed.

### Columns

Put `<columns: N>` on its own line to start a multi-column region, where N is 1 to 6, and `</columns>` on its own line to end it. Content in between flows into N columns in both the preview and the PDF. An unclosed `<columns: N>` runs to the end of the note. Lines inside code blocks are not changed.

### Alignment

Put `<align: VALUE>` on its own line to set the text alignment for the content after it, and `</align>` on its own line to end it. VALUE is `left`, `right`, `center`, or `justified`. An unclosed `<align: VALUE>` runs to the end of the note. Lines inside code blocks are not changed.

Columns and alignment can nest in any order. Several start tokens can share one line, such as `<columns: 2><align: left>`. For example, `<align: center>` inside a `<columns: 2>` region centers the text in one column. Each closing token closes the innermost open region of its kind. If a closing token would cross another open region, it is left as written.

### Table of contents

Put `<toc>` on its own line where the table of contents should go. It lists the headings in the note, from the levels set under **Table of contents** in the settings (H1–H2 by default, or H1–H3, or all levels). Each entry links to its heading, and shows its page with dot leaders when page numbers are on.

Three **Table of contents level** styles (Level 1, 2, 3) in the Styles panel set the font for TOC entries. Level 1 is used for H1 headings, level 2 for H2, and level 3 for H3. They apply only to the table of contents, and body headings keep their H1–H6 styles.

Making the table of contents takes two print passes, so export is slower for notes that use `<toc>`. Notes with no `<toc>` are unchanged.

If the note has no `<page-numbering>` markers of its own, the table of contents is numbered as front matter: lowercase roman up to the table of contents, then the body restarting at 1. A note with its own markers keeps exactly what those markers say.

pdf.js reads the printed PDF to find heading pages, so the plugin ships `pdf.worker.mjs` next to `main.js`. Both files are needed for the plugin to work.

### Page numbering

Put `<page-numbering ...>` on its own line to start a new numbering group from that point on. Each group is printed as its own section and merged into one PDF, so its numbers restart correctly.

- `<page-numbering section: 1 type: i start: 1>` starts a group. `type` is `1` (arabic), `i`, `I`, `a`, or `A`. `start` is the number of the group's first page. Omit `start` to continue the count from the previous page. Omit `type` to keep the previous style. `section:` labels the group and does not change numbering.
- `<page-numbering numbers: hide>` hides page numbers from that point on.
- `<page-numbering numbers: show>` shows them again.

`{pages}` in the page number format is the total for the current group, not the whole note. Lines inside code blocks are not changed. Invalid markers are left as written.

### Tables

The **Table** section sets fills and rules for the whole table:

- **Header row**: fill, text color, bold, and a rule under the header.
- **Body rows**: fill, an alternate-row (zebra) fill, and a rule between rows.
- **Columns**: a vertical rule between columns.
- **Grid**: the outer border, cell padding (vertical and horizontal), and a **Full width** option that stretches the table across the text width within the margins with equal columns.

Space before and after a table is set with **Space before table** and **Space after table**, each with a unit dropdown. These are the same values as the Table paragraph style.

Rule widths are in pt, where 0 turns the rule off. Clear a color with its reset button to fall back to the default. Table text uses the Table paragraph style.

### Themes

Use **Save current style as theme** to store the page, margin, paragraph style, and header/footer settings under a name. Load, delete, or reset from the Themes section. Themes are stored in the plugin's data file.

### PDF preview

Open the **PDF preview** pane from the ribbon icon or the "Open PDF preview" command. It shows the PDF for the active note beside it and re-renders after you edit the note or change settings. Live update and the delay are in the PDF preview settings section. Use **Refresh** to render immediately. The **Baseline grid** switch in the preview toolbar draws light blue lines at the baseline grid step, to check text alignment. The **Margins** switch draws a magenta frame at the margin edges. Both overlays are preview-only and never appear in exported PDFs.

### Theme preview

The settings page has a **Theme preview** tab. It shows Lorem Ipsum sample text for every heading level and common text styles. It uses the same CSS as export, so it updates as you change settings.

## Development

```bash
npm install
npm run build
```

Symlink the project into a vault's `.obsidian/plugins/md-to-pdf` folder to test it in Obsidian.
