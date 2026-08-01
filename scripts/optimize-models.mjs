// Rebuild public/models/*.glb from the raw exports in animations/.
//
// TEXTURES ARE STRIPPED, geometry and animation are untouched:
// - the baked textures carry dark crack veins and baked crevice shading that
//   smear across the surface when hips/shoulders fold mid-clip — on the cards
//   it reads as the mesh tearing open ("clipping"). CoachStage renders the
//   gods as clean ivory marble instead, so the maps are dead weight.
// - meshopt/`optimize` resample+quantize animation, which melted the fast
//   arm arcs into the torso mid-swing; `quantize` corrupted the skinned
//   legs/skirt (position quantization is compensated via node transforms,
//   which skinned vertices ignore). So no geometry/animation processing —
//   only texture removal and pruning of the attributes textures referenced.
import { statSync } from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune } from "@gltf-transform/functions";

const MODELS = ["adonis_curl", "atalanta_pistol", "hermes_run"];
const mb = (p) => (statSync(p).size / 1e6).toFixed(2) + " MB";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const name of MODELS) {
  const src = join("animations", `${name}.glb`);
  const out = join("public", "models", `${name}.glb`);
  const doc = await io.read(src);

  for (const mat of doc.getRoot().listMaterials()) {
    mat
      .setBaseColorTexture(null)
      .setNormalTexture(null)
      .setOcclusionTexture(null)
      .setMetallicRoughnessTexture(null)
      .setEmissiveTexture(null)
      // sane statue fallback for any viewer that skips the marble override;
      // OPAQUE matters — the exports ship alphaMode BLEND, and a transparent
      // self-overlapping skinned mesh draws with depth-sorting errors
      .setBaseColorFactor([0.94, 0.92, 0.87, 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(0.5)
      .setAlphaMode("OPAQUE");
    // KHR_materials_specular etc. carry their own 4k texture slots
    for (const ext of mat.listExtensions()) ext.dispose();
  }

  // drops the now-unreferenced textures and their UV sets
  await doc.transform(prune({ keepAttributes: false, keepSolidTextures: false }));

  await io.write(out, doc);
  console.log(`${name}: ${mb(src)} -> ${mb(out)}`);
}
