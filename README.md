# md-to-pdf

An Obsidian plugin that exports Markdown notes to beautifully laid-out PDF files.

The export renders the note with Obsidian's own markdown renderer, so custom code block renderers (such as BRNotation) appear in the PDF as they do in preview.

## Status

Early development. Export works for body content, page setup, typography, headers, and page numbers. BRNotation staff notation is still being refined. See [ROADMAP.md](ROADMAP.md) for planned work.

### Fonts

The font dropdown lists the system stacks, then two bundled collections:

- **TeX Gyre**: Adventor, Bonum, Cursor, Heros, Heros Condensed, Pagella, Schola, Termes. Licensed under the GUST Font License (`assets/fonts/tg/LICENSE-GFL.txt`).
- **League of Moveable Type**: all families in the collection, licensed under the SIL Open Font License 1.1 (`assets/fonts/league/LICENSE-OFL.txt`). See `assets/fonts/league/NOTICE.md` for copyright notices.

- **League Gothic** and **League Gothic Condensed**: included under the same license.

TeX Gyre Chorus is not bundled because the archive only includes its medium italic face.

Set page margins in mm, cm, inches, points, or picas with the **Margin unit** dropdown. Values are stored in mm, so changing the unit only changes how they are shown.

Heading line height is set under **Headings** (unitless, default 1, like the body line height). Use it to tighten or loosen multi-line headings.

Choose a font from the grouped dropdown. Headings and body text each have their own weight and italic settings. For bundled families, pick the variation with the radio button beside its preview. Previews are drawn at the chosen point size.

### Typography

The **Typography** section in settings controls:

- **Pretty line wrapping** (`text-wrap: pretty`) avoids short last lines in paragraphs and list items. On by default.
- **Hyphenation**, with a language for the hyphenation dictionary (for example `en-US`, `de`, or `fr`). Off by default.
- **Justified text**. Off by default.
- **Ligatures**. On by default. Turning them off disables `liga`, `clig`, and `dlig`.
- **Oldstyle figures** (`onum`), if the font supports them.
- **Small caps headings** (headings are set in small caps, with balanced line breaks).
- **Baseline grid**. When enabled, paragraph and heading spacing snaps to multiples of the grid unit (in pt). This is an approximation: body line height is not forced to the grid.

Hyphenation and justification are applied by Chromium's print engine, so they show in exported PDFs.

### Themes

Use **Save current style as theme** to store the page, margin, font, heading weight and italic, code, and header/footer settings under a name. Load, delete, or reset from the Themes section. Themes are stored in the plugin's data file.

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
