# Honolulu cocktail bar

Original stylized asset created for BOB using Blender. Includes the pavilion, stools,
bottles, coconut cocktails at real size, flowering shrubs and ferns, palms in planters,
signage and warm lanterns, and a lounge deck to stand beside it.

- `honolulu-bar.glb`: self-contained static bar model, meters, glTF Y-up; front faces +Z.
- `honolulu-lounge.glb`: the lounge deck (plank deck, round table under a thatched parasol,
  four chairs, drinks, two potted palms), centred on its own origin so a bar can have it on
  either side.
- `honolulu-preview.png`: studio render of both; studio ground, camera and lights are excluded
  from the GLBs.
- Generator: `tools/props/build-honolulu.py` (Blender 5.2), writes all three.

The runtime integration lives in `src/world/HonoluluBar.js`. A bar takes a site
`{ x, z, yaw, padRadius, deck }`: the village bar stands at `(8, -68)` on the beach west of
the pier; the atoll resort has a second one between the lodge and a villa
(`Archipelago` `sites.bar`). Each flattens its pad and the lounge's, excludes vegetation,
adds collision for the decks, step, furniture, posts and the guests, and registers two
warm lantern lights and the fire's light.

The crowd uses BOB's Rocketbox character pipeline through `SkinnedModel`. Marta is the
barmaid. The seven guests use `public/models/characters/beach-customer.glb` (Rocketbox
`Sports_Female_01`, with Rocketbox dance clips), plus Marta's talk and shrug clips (same
skeleton). Each guest's swimwear is re-dyed in the material (the texture's magenta) and her
skin tone varied. Two chat at the counter between the stools, two friends talk by the lounge
deck, one vapes (the arm posed to the mouth, a pen in her fingers, a cloud blown out), one
watches the gulls over the sea past the fire, one dances.

The bonfire towards the sea uses the Quaternius/Poly Pizza GLB for its stones and logs; the
fire itself (the lake house's shader flames and embers), its light and the `fire_hearth.ogg`
crackle are there only from dusk to dawn. Bar music (the Kevin MacLeod bossa/lounge tracks
credited in `public/audio/CREDITS.md`) is heard to about 10 m from the bar.

The shelf bottles reuse the geometry from Poly Haven's `wine_bottles_01` model (CC0,
by Jurita Burger and Rico Cilliers). The generator flattens those materials into solid
colors before export because the lightweight Honolulu static loader uses glTF material
factors rather than image textures.

Open `?view=honolulu&noRealTime&time=15` for the review camera.
