# Screenshots

Automated screenshot and video capture using Playwright.

- `ui-layout.png` — Main UI screenshot with sidebar, issue list, and detail panel
- `demo.webm` — Demo video recording of the analysis workflow

## Scripts

- `capture.ts` — Captures a single screenshot of the full UI after analysis
- `record-demo.ts` — Records a demo video showing the analysis workflow

## Usage

```bash
# Start dev server first
npm run dev

# Capture screenshot
npx tsx screenshots/capture.ts

# Record demo video
npx tsx screenshots/record-demo.ts
```
