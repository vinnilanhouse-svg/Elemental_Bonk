const { spawnSync } = require("node:child_process"),
  fs = require("node:fs");
const suites = [
  "browser",
  "stability-browser",
  "species-browser",
  "new-species-browser",
  "enemies-browser",
  "field-items-browser",
  "map-browser",
  "experience-browser",
  "performance-browser",
];
const selected = process.argv.slice(2).length ? process.argv.slice(2) : suites;
const results =
  process.argv.slice(2).length &&
  fs.existsSync("reports/browser-regressions.json")
    ? JSON.parse(
        fs.readFileSync("reports/browser-regressions.json", "utf8"),
      ).filter((r) => !selected.includes(r.suite))
    : [];
fs.mkdirSync("reports", { recursive: true });
for (const suite of selected) {
  const begin = Date.now();
  const result = spawnSync(process.execPath, ["tests/" + suite + ".cjs"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  results.push({
    suite,
    exitCode: result.status,
    durationMs: Date.now() - begin,
  });
  fs.writeFileSync(
    "reports/browser-regressions.json",
    JSON.stringify(results, null, 2),
  );
  if (result.status !== 0) process.exit(1);
}
