# Playground

Test cases for manual testing. Press <kbd>F5</kbd> in the repo: a new window opens with these folders loaded. In each file, put the cursor on the color and press <kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd> <kbd>Ctrl/Cmd</kbd>+<kbd>G</kbd>. The status bar shows which version was used and why.

Each case is its own workspace folder (see `playground.code-workspace`), so detection in one case can't see the others.

| Case | File | Expected |
| --- | --- | --- |
| 1-v4-package-json | `src/app.css` | Only the `--color-*` lines (inside `@theme`), 50–950, OKLCH. `v4 from package.json` |
| 2-v3-package-json | `tailwind.config.js` | `blue: { 50: '#…', …, 950 }`. `v3 from package.json` |
| 3-v4-css-only | `styles.css` | Only the `--color-*` lines, OKLCH. `v4 from this file` |
| 4-v3-css-only | `styles.css` | `--violet-50: #…;` CSS variables. `v3 from this file` |
| 5-v3-config-file | `colors.css` | CSS variables, hex, 50–950. `v3 from tailwind.config.js` |
| 6-v2-css | `styles.css` | CSS variables, 50–900 (no 950). `v2 from this file` |
| 7-no-tailwind | `styles.css` | A full `@theme { … }` block, OKLCH. `v4, no Tailwind found` |

Undo (<kbd>Ctrl/Cmd</kbd>+<kbd>Z</kbd>) after each test to keep the files ready for the next run.
