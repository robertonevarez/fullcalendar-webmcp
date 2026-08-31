import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function run(command, cwd = rootDir) {
  console.log(`\n> [${path.relative(rootDir, cwd) || "root"}] ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

console.log("=== Phase 2: Package Tarball & External Consumer Validation ===");

// 1. Build library
run("npm run build:lib");

// 2. Pack tarball
run("npm pack");

const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
);
const tarballName = `protocoltooling-fullcalendar-${packageJson.version}.tgz`;
const tarballPath = path.join(rootDir, tarballName);

for (const fixture of [
  "tests/fixtures/vite-consumer/package.json",
  "tests/fixtures/nextjs-consumer/package.json",
]) {
  const fixturePath = path.join(rootDir, fixture);
  const fixturePkg = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  fixturePkg.dependencies["@protocoltooling/fullcalendar"] =
    `file:../../../${tarballName}`;
  fs.writeFileSync(fixturePath, `${JSON.stringify(fixturePkg, null, 2)}\n`);
}

if (!fs.existsSync(tarballPath)) {
  console.error(`Error: Tarball ${tarballName} was not found at ${tarballPath}`);
  process.exit(1);
}

// 3. Inspect tarball contents
console.log(`\n--- Inspecting Tarball: ${tarballName} ---`);
const tarContents = execSync(`tar -tf "${tarballPath}"`, { encoding: "utf-8" })
  .trim()
  .split("\n");

console.log(tarContents.join("\n"));

const expectedFiles = [
  "package/package.json",
  "package/README.md",
  "package/LICENSE",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/index.js.map",
];

const unexpected = tarContents.filter((file) => !expectedFiles.includes(file));
if (unexpected.length > 0) {
  console.error("Error: Unexpected files found in tarball:", unexpected);
  process.exit(1);
}
console.log("✓ Tarball contents verified: pure package artifact with zero leaks.");

// 3b. Runtime smoke against the packed dist (not TypeScript source)
console.log("\n--- Packed artifact tool smoke ---");
run(`node ./scripts/smoke-packed-tools.mjs "${tarballName}"`);
console.log("✓ Packed artifact tool smoke passed!");

// 4. Test Consumer A: Vite Consumer (React 19 + FullCalendar React v7)
console.log("\n--- Testing Consumer A: Vite + React 19 + FullCalendar v7 ---");
const viteConsumerDir = path.join(rootDir, "tests/fixtures/vite-consumer");
run("npm install", viteConsumerDir);
run("npm run build", viteConsumerDir);
console.log("✓ Consumer A (Vite + React 19 + FullCalendar v7) built successfully!");

// 5. Test Consumer B: Next.js 16 App Router (React 19 + FullCalendar React v6 + Server Actions)
console.log("\n--- Testing Consumer B: Next.js 16 + React 19 + FullCalendar v6 ---");
const nextConsumerDir = path.join(rootDir, "tests/fixtures/nextjs-consumer");
run("npm install", nextConsumerDir);
run("npm run build", nextConsumerDir);
console.log("✓ Consumer B (Next.js 16 App Router + FullCalendar v6) built successfully!");

console.log("\n=== ALL CONSUMER VALIDATION QUALITY GATES PASSED! ===");
