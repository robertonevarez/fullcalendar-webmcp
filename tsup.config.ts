import fs from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  tsconfig: "tsconfig.lib.json",
  external: ["react", "@fullcalendar/react"],
  treeshake: true,
  async onSuccess() {
    const filePath = path.resolve("dist/index.js");
    const content = await fs.readFile(filePath, "utf-8");
    if (!content.startsWith('"use client";') && !content.startsWith("'use client';")) {
      await fs.writeFile(filePath, `'use client';\n${content}`, "utf-8");
    }
  },
});
