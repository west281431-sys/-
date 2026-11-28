// node render.mjs stills NAME 1 5 10   -> out/NAME_1.png ... (check frames)
// node render.mjs full NAME            -> out/NAME.mp4      (final video)
import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
const [mode = "stills", id = "Example", ...times] = process.argv.slice(2);
fs.mkdirSync("out", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id });
if (mode === "stills") {
  for (const t of times.map(Number)) await renderStill({ composition, serveUrl, frame: Math.round(t * 30), output: `out/${id}_${t}.png` });
} else {
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, outputLocation: `out/${id}.mp4`, concurrency: 2,
    onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%`) });
}
console.log("\ndone");
fs.rmSync(serveUrl, { recursive: true, force: true });
