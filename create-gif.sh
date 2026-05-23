#!/bin/bash
# Converts GIF frames to an animated GIF using ImageMagick + gifsicle
set -e

FRAMES_DIR="docs/screenshots/gif-frames"
OUT="assets/demo.gif"

mkdir -p assets

if [ ! -d "$FRAMES_DIR" ] || [ -z "$(ls $FRAMES_DIR/frame-*.png 2>/dev/null)" ]; then
  echo "No frames found in $FRAMES_DIR. Run take-screenshots.mjs first."
  exit 1
fi

COUNT=$(ls $FRAMES_DIR/frame-*.png | wc -l | tr -d ' ')
echo "→ Creating animated GIF from $COUNT frames..."

# Build the convert command dynamically
ARGS=()
DELAYS=(120 120 80 100 80 80 100 100 80 100 100 80 100 100 80 100 120 200)

for i in $(seq 0 $((COUNT - 1))); do
  PAD=$(printf "%03d" $i)
  DELAY=${DELAYS[$i]:-80}
  ARGS+=("-delay" "$DELAY" "${FRAMES_DIR}/frame-${PAD}.png")
done

convert "${ARGS[@]}" \
  -loop 0 \
  -resize 1200x \
  -layers Optimize \
  -dither FloydSteinberg \
  -colors 128 \
  "${OUT}.tmp.gif"

echo "→ Optimizing with gifsicle..."
gifsicle --optimize=3 --colors 128 --loopcount=0 "${OUT}.tmp.gif" -o "${OUT}"
rm "${OUT}.tmp.gif"

SIZE=$(du -sh "$OUT" | cut -f1)
echo "✅ Created $OUT ($SIZE)"
