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

The crowd uses BOB's existing Rocketbox character pipeline through `SkinnedModel`.
Marta remains behind the counter as the barmaid. The four dancing customers use
`public/models/characters/beach-customer.glb`, converted from Rocketbox
`Sports_Female_01` with the same idle/talk/wave clips and a modified body texture for
a coconut-top beach outfit. The beach customer GLB also includes Rocketbox dance clips
(`dancing_neutral`, `dancing_cool`, `dancing_silly`) for the bar crowd.

The bar also owns a large beach bonfire placed between the bar and the sea, using the Quaternius/Poly Pizza GLB as the base with BOB's own animated flame meshes, local fire light and the existing `fire_hearth.ogg` crackle. Bar music uses the existing Kevin MacLeod
bossa/lounge tracks already credited in `public/audio/CREDITS.md`.

The shelf bottles reuse the geometry from Poly Haven's `wine_bottles_01` model (CC0,
by Jurita Burger and Rico Cilliers). The generator flattens those materials into solid
colors before export because the lightweight Honolulu static loader uses glTF material
factors rather than image textures.

Open `?view=honolulu&noRealTime&time=15` for the review camera.
