// Rebuild public/models/*.glb from the raw exports in animations/.
//
// TEXTURES ONLY — deliberately no geometry or animation processing:
// - meshopt/`optimize` resample+quantize animation, which melted the fast
//   arm arcs into the torso mid-swing
// - `quantize` corrupted the skinned legs/skirt (position quantization is
//   compensated via node transforms, which skinned vertices ignore)
// Textures are ~90% of the raw size anyway, so WebP @1024 gets the win while
// keeping mesh + animation byte-identical to the raw exports.
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
    run(["resize", src, a, "--width", "1024", "--height", "1024"]);
    run(["webp", a, out]);
    console.log(`${name}: ${mb(src)} -> ${mb(out)}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
