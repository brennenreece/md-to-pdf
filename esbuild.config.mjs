import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@electron/remote",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

// pdf.js needs its worker as a separate file. Copy it next to main.js so it ships with the plugin.
import { copyFileSync } from "fs";
const copyWorker = () => copyFileSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "pdf.worker.mjs");

if (prod) {
  await context.rebuild();
  copyWorker();
  process.exit(0);
} else {
  copyWorker();
  await context.watch();
}
