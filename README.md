# mahmostash.github.io

Personal site of Mahdyar Mostashar. Plain HTML/CSS/JS, no build step.

## Run locally
```
python3 -m http.server 8000
```
then open http://localhost:8000

## Deploy (GitHub Pages)
1. Create a public repo named exactly `mahmostash.github.io`.
2. Push this folder's contents to `main`.
3. The site is live at https://mahmostash.github.io (Settings → Pages → "Deploy from branch: main / root" if it isn't automatic).

## Where things live
- `index.html`: all content (edit text here)
- `assets/img/mahdyar.jpg`: portrait (EXIF stripped)
- `assets/js/main.js`: theme, nav, playground tabs, teaching heatmap data (`TA`)
- `assets/js/market.js`: regime-switching GARCH playground + research sparklines
- `assets/js/bandit.js`: Thompson-sampling playground
- `assets/js/crowd.js`: "read the crowd" game (engine is Node-testable via require)
- `assets/js/terminal.js`: the ` terminal (commands, files, neofetch)

## Updating my Wordle results
Wordle is a game by The New York Times; the site only shows my own results (no letters, no spoilers)
and links to the NYT game. The block stays hidden until `assets/data/wordle.json` has data.

1. Play on nytimes.com/games/wordle, then tap **Share** (copies the result).
2. Run, from this folder:
   ```
   python3 tools/wordle.py --push
   ```
   Add stats from the NYT Statistics screen whenever you like:
   ```
   python3 tools/wordle.py --played 212 --win 98 --streak 14 --max 41 --dist 0,6,48,92,51,11 --push
   ```
   `--stats-only` updates the numbers without touching today's grid.
