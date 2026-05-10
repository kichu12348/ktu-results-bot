Bun.build({
  entrypoints: ["src/bot.ts"],
  outdir: "dist",
  minify: true,
  sourcemap: "none",
  target: "bun",
})
  .then(() => {
    console.log("Build successful!");
  })
  .catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });
