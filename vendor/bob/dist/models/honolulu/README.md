# Honolulu cocktail bar

Original stylized asset created for BOB using Blender. Includes the pavilion, stools,
bottles, coconut cocktails, plants, signage and warm lanterns.

- `honolulu-bar.glb`: self-contained static bar model, meters, glTF Y-up; front faces +Z.
- `honolulu-preview.png`: studio render; studio ground, camera and lights are excluded from GLB.
- Base generator: `tools/props/build-honolulu.py` (Blender 5.2).

The runtime integration lives in `src/world/HonoluluBar.js`. It places the bar at
`(8, -68)` on the village beach west of the pier, flattens a small pad, excludes
vegetation, adds collision for the deck, step, furniture and posts, and registers two
warm lantern lights.

The crowd uses BOB's existing Rocketbox `marta.glb` character through `SkinnedModel`,
with five instances placed around the counter. Each instance gets a small material tint,
scale offset, yaw sway and a different idle clip so the bar feels crowded without adding
more character assets.

Open `?view=honolulu&noRealTime&time=15` for the review camera.
