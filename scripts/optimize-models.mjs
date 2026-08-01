// Rebuild public/models/*.glb from the raw exports in animations/.
//
// Deliberately NO meshopt/draco and NO `optimize`: their animation
// resampling/quantization corrupts the fast limb arcs on these Mixamo clips
// (hands melt into the torso mid-swing). Textures are ~90% of the raw size,
// so WebP @1024 plus mesh-attribute quantization gets the win while keeping
// animation samplers byte-identical.
import { execFileSync } from "node:child_process";
import { statSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MODELS = ["adonis_curl", "atalanta_pistol", "hermes_run"];
const mb = (p) => (statSync(p).size / 1e6).toFixed(2) + " MB";
const cliDir = join("node_modules", "@gltf-transform", "cli");
const cliPkg = JSON.parse(readFileSync(join(cliDir, "package.json"), "utf8"));
const cliJs = join(cliDir, typeof cliPkg.bin === "string" ? cliPkg.bin : cliPkg.bin["gltf-transform"]);
const run = (args) => execFileSync(process.execPath, [cliJs, ...args], { stdio: "inherit" });

const tmp = mkdtempSync(join(tmpdir(), "fitnext-glb-"));
try {
  for (const name of MODELS) {
    const src = join("animations", `${name}.glb`);
    const out = join("public", "models", `${name}.glb`);
    const a = join(tmp, `${name}-a.glb`);
    const b = join(tmp, `${name}-b.glb`);
    run(["dedup", src, a]);
    run(["resize", a, b, "--width", "1024", "--height", "1024"]);
    run(["webp", b, a]);
    run(["quantize", a, out]);
    console.log(`${name}: ${mb(src)} -> ${mb(out)}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
