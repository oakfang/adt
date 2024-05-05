import dts from "bun-plugin-dts";

await Bun.build({
  entrypoints: ["./lib/index.ts"],
  outdir: "./node",
  plugins: [dts()],
});
