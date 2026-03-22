# LeetFocusMode (Chrome Extension)

This extension automatically hides the `Easy` / `Medium` / `Hard` difficulty tag and (optionally) the `Hints` / `Discussion` / `Editorial` sections on `leetcode.com`.

## Load it in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the folder: `LeetFocusMode`

## Icons

Icons live in `icons/` and are wired in `manifest.json`:

- **`icons`** — used in `chrome://extensions`, the Chrome Web Store, and install dialogs (16 / 48 / 128 px).
- **`action.default_icon`** — what you see on the toolbar next to the address bar.

Replace `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, and `icons/icon128.png` with your own PNGs (same filenames). Use a square design; Chrome will scale.

## Notes

- The extension runs on all `https://leetcode.com/*` pages.
- LeetCode renders content dynamically, so it uses a `MutationObserver` to keep hiding the tag if it appears later.
- There is a popup UI (extension icon) with toggles for each item. Changes apply automatically (no page reload).
- If it doesn't hide a section on your view, open DevTools on a LeetCode page and inspect the `Hints`/`Discussion`/`Editorial` header element—then we can tighten the selector in `content.js`.

