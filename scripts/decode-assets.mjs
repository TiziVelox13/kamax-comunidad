// Decodifica los assets binarios versionados como texto base64 (assets.b64/)
// a sus rutas reales. Corre automáticamente en predev/prebuild.
// Motivo: el pipeline de commits del proyecto solo transporta texto plano.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const SRC = new URL("../assets.b64/", import.meta.url).pathname;
if (!existsSync(SRC)) {
  console.log("[assets] sin assets.b64/ — nada que decodificar");
  process.exit(0);
}
const root = new URL("../", import.meta.url).pathname;
let n = 0;
for (const f of readdirSync(SRC)) {
  if (!f.endsWith(".b64")) continue;
  // nombre codifica la ruta: public__img__moto-34.webp.b64 → public/img/moto-34.webp
  const rel = f.slice(0, -4).replaceAll("__", "/");
  const out = join(root, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(readFileSync(join(SRC, f), "utf8").replace(/\s+/g, ""), "base64"));
  n++;
}
console.log(`[assets] ${n} binarios decodificados`);
