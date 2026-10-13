# md-to-pdf

An Obsidian plugin that exports Markdown notes to beautifully laid-out PDF files.

The export renders the note with Obsidian's own markdown renderer, so custom code block renderers (such as BRNotation) appear in the PDF as they do in preview.

## Status

Early development. Export works for body content, page setup, typography, headers, and page numbers. BRNotation staff notation is still being refined.

### Fonts

The font dropdown lists the system stacks, then two bundled collections:

- **TeX Gyre**: Adventor, Bonum, Cursor, Heros, Heros Condensed, Pagella, Schola, Termes. Licensed under the GUST Font License (`assets/fonts/tg/LICENSE-GFL.txt`).
- **League of Moveable Type**: all families in the collection, licensed under the SIL Open Font License 1.1 (`assets/fonts/league/LICENSE-OFL.txt`). See `assets/fonts/league/NOTICE.md` for copyright notices.

TeX Gyre Chorus is not bundled because the archive only includes its medium italic face.

### Themes

Use **Save current style as theme** to store the page, margin, font, heading, code, and header/footer settings under a name. Load, delete, or reset from the Themes section. Themes are stored in the plugin's data file.

## Development

```bash
npm install
npm run build
```

Symlink the project into a vault's `.obsidian/plugins/md-to-pdf` folder to test it in Obsidian.
