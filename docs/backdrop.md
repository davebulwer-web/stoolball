# Backdrop

`assets/backdrop.png` (320x180) is a Pixellab `generate-image-pixflux` image, made 2026-11-11 with no init image
(guided attempts at strengths 60-300 banded the sky). Prompt: side view of an English village ground at dusk,
low sun on the upper left, wispy clouds lit from below, tree line, cottage on the right, mown outfield, no people.

Fitted by script (`sprites/backdrop/fit.py` in the project files): the distant dirt patch is painted out and the
foreground grass (y >= 124) is tiled from the clean middle so no grass blades sit behind the umpire or keeper.
The horizon falls at about y=110, close to the old hedge line at 112.

The game draws the pitch strip and the three creases on top at GROUND (y=150), so the geometry stays in code.
Add `?backdrop=flat` to the URL to get the old hand-coded bands back for comparison.
