#!/usr/bin/env bash
# Lighthouse móvil (3 corridas por página; se reporta la mediana de Performance).
# Requiere el sitio servido en http://localhost:4173 (npm run serve).
set -euo pipefail
CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium-1243/chrome-linux64/chrome}"
export CHROME_PATH
mkdir -p docs/lighthouse
for p in proyectos proyectos/mapocho-3521 proyectos/vitro; do
  n=$(echo "$p" | tr / -)
  for i in 1 2 3; do
    npx lighthouse "http://localhost:4173/$p/" --quiet --chrome-flags="--headless=new --no-sandbox" \
      --output=json --output=html --output-path="docs/lighthouse/$n-$i" --form-factor=mobile >/dev/null 2>&1 || true
  done
  node -e "
    const rs=[1,2,3].map(i=>require('./docs/lighthouse/$n-'+i+'.report.json')).sort((a,b)=>a.categories.performance.score-b.categories.performance.score);
    const r=rs[1];
    console.log('/$p/ →', Object.values(r.categories).map(c=>c.title+' '+Math.round(c.score*100)).join(' · '),
      '| LCP', r.audits['largest-contentful-paint'].displayValue, '| CLS', r.audits['cumulative-layout-shift'].displayValue, '| TBT', r.audits['total-blocking-time'].displayValue,
      '| Perf en 3 corridas:', rs.map(x=>Math.round(x.categories.performance.score*100)).join('/'));
  "
done
