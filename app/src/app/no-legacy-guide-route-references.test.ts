import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const forbiddenRoute = "/" + "do" + "cs";
const forbiddenComponentName = "D" + "o" + "cs";
const sourceRoots = ["src/app", "src/content"];
const sourceExtensions = new Set([".ts", ".tsx"]);

function extensionOf(path: string) {
  const lastDot = path.lastIndexOf(".");
  return lastDot === -1 ? "" : path.slice(lastDot);
}

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return collectSourceFiles(path);
    }

    if (!sourceExtensions.has(extensionOf(path))) {
      return [];
    }

    return [path];
  });
}

test("product source has no legacy guide route references", () => {
  const matches = sourceRoots
    .flatMap(collectSourceFiles)
    .filter((path) => !path.endsWith("no-legacy-guide-route-references.test.ts"))
    .flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const findings = [];

      if (source.includes(forbiddenRoute)) {
        findings.push(`${path} contains ${forbiddenRoute}`);
      }

      if (source.includes(forbiddenComponentName)) {
        findings.push(`${path} contains ${forbiddenComponentName}`);
      }

      return findings;
    });

  assert.deepEqual(matches, []);
});
