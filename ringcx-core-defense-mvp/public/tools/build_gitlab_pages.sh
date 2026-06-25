#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/public"
SRC_DIR="$ROOT_DIR/ringcx-core-defense-mvp"
LATEST_GAME="$SRC_DIR/hi/index.html"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/hi" "$OUT_DIR/local-run-monitor" "$OUT_DIR/docs/homepage-review-ui" "$OUT_DIR/tools"
mkdir -p "$OUT_DIR/assets/sprites/high-dev-standard"
mkdir -p "$OUT_DIR/assets/audio"
mkdir -p "$OUT_DIR/review-mockups"

sed \
  -e 's#href="../docs/#href="./docs/#g' \
  -e 's#src="../telemetry-config.js"#src="./telemetry-config.js"#g' \
  -e 's#src="../local-run-monitor/game-run-telemetry.js"#src="./local-run-monitor/game-run-telemetry.js"#g' \
  -e 's#data-src="../docs/#data-src="./docs/#g' \
  -e 's#const HI_ASSET_ROOT = "../assets/sprites/high-dev-standard/alpha";#const HI_ASSET_ROOT = "./assets/sprites/high-dev-standard/alpha";#' \
  "$LATEST_GAME" > "$OUT_DIR/index.html"
cp "$SRC_DIR/hi/index.html" "$OUT_DIR/hi/index.html"
cp "$SRC_DIR/telemetry-config.js" "$OUT_DIR/telemetry-config.js"
cp "$SRC_DIR/local-run-monitor/game-run-telemetry.js" "$OUT_DIR/local-run-monitor/game-run-telemetry.js"
cp "$SRC_DIR/local-run-monitor/index.html" "$OUT_DIR/local-run-monitor/index.html"
cp "$SRC_DIR/local-run-monitor/app.js" "$OUT_DIR/local-run-monitor/app.js"
cp "$SRC_DIR/local-run-monitor/styles.css" "$OUT_DIR/local-run-monitor/styles.css"
cp "$ROOT_DIR/README.md" "$OUT_DIR/README.md"
cp "$ROOT_DIR/BACKLOG.md" "$OUT_DIR/BACKLOG.md"
cp "$ROOT_DIR/SPEC.md" "$OUT_DIR/SPEC.md"
cp "$ROOT_DIR/ARCHITECTURE.md" "$OUT_DIR/ARCHITECTURE.md"
cp "$ROOT_DIR/RETROSPECTIVE.md" "$OUT_DIR/RETROSPECTIVE.md"
cp "$ROOT_DIR/CHALLENGE_COMPLIANCE.md" "$OUT_DIR/CHALLENGE_COMPLIANCE.md"
cp "$ROOT_DIR/PUBLIC_DEPLOYMENT.md" "$OUT_DIR/PUBLIC_DEPLOYMENT.md"
cp "$ROOT_DIR/tools/build_gitlab_pages.sh" "$OUT_DIR/tools/build_gitlab_pages.sh"
cp "$SRC_DIR/docs/product-architecture-interactive.html" "$OUT_DIR/docs/product-architecture-interactive.html"
cp "$SRC_DIR/docs/public-access-std-hi-telemetry-plan.md" "$OUT_DIR/docs/public-access-std-hi-telemetry-plan.md"
cp "$SRC_DIR/docs/high-animation-dev-standard.md" "$OUT_DIR/docs/high-animation-dev-standard.md"
cp "$SRC_DIR/docs/public-telemetry-collector-setup.md" "$OUT_DIR/docs/public-telemetry-collector-setup.md"
cp "$SRC_DIR/docs/hi-preflight-latest.md" "$OUT_DIR/docs/hi-preflight-latest.md"
cp "$SRC_DIR/docs/enemy-hp-ui-options-comparison.svg" "$OUT_DIR/docs/enemy-hp-ui-options-comparison.svg"
cp "$SRC_DIR/docs/homepage-review-ui/option-b24-core-cry-crystal-right.svg" "$OUT_DIR/docs/homepage-review-ui/option-b24-core-cry-crystal-right.svg"
cp "$SRC_DIR/assets/high-visual-reference.png" "$OUT_DIR/assets/high-visual-reference.png"
cp "$SRC_DIR/assets/audio/signal-pursuit.mp3" "$OUT_DIR/assets/audio/signal-pursuit.mp3"
cp -R "$SRC_DIR/assets/sprites/high-dev-standard/alpha" "$OUT_DIR/assets/sprites/high-dev-standard/alpha"
cp -R "$SRC_DIR/assets/sprites/high-dev-standard/previews" "$OUT_DIR/assets/sprites/high-dev-standard/previews"
cp -R "$SRC_DIR/review-mockups/arena-defender-options" "$OUT_DIR/review-mockups/arena-defender-options"
cp -R "$SRC_DIR/review-mockups/hi-core-focus-all-stages" "$OUT_DIR/review-mockups/hi-core-focus-all-stages"

cat > "$OUT_DIR/404.html" <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RingCX Core Defense</title>
</head>
<body>
  <p>Build not found. Open <a href="./hi/">RingCX Core Defense HI</a> or <a href="./docs/product-architecture-interactive.html">product architecture website</a>.</p>
</body>
</html>
HTML
