# md-to-pdf

An Obsidian plugin that exports Markdown notes to beautifully laid-out PDF files.

The export renders the note with Obsidian's own markdown renderer, so custom code block renderers (such as BRNotation) appear in the PDF as they do in preview.

## Status

Early development. Export works for body content, page setup, typography, headers, and page numbers. BRNotation staff notation is still being refined.

## Development

```bash
npm install
npm run build
```

Symlink the project into a vault's `.obsidian/plugins/md-to-pdf` folder to test it in Obsidian.
