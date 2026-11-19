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
- `assets/js/clt.js`: Central Limit Theorem playground
- `assets/js/terminal.js`: the ` terminal (commands, files, neofetch)
