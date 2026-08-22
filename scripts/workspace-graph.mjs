import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apps = ["web", "api", "worker"];
const packages = ["db", "shared", "config", "llm"];
const appPackages = new Set(apps.map((name) => `@lumi/${name}`));

for (const path of [...apps.map((name) => join("apps", name)), ...packages.map((name) => join("packages", name))]) {
  if (!existsSync(join(root, path, "package.json"))) throw new Error(`Missing workspace package: ${path}`);
}

for (const app of apps) {
  const manifest = JSON.parse(readFileSync(join(root, "apps", app, "package.json"), "utf8"));
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  if (Object.keys(dependencies).some((name) => appPackages.has(name))) {
    throw new Error(`App-to-app dependency found in apps/${app}`);
  }
}

console.log(`Workspace graph OK: ${apps.length} apps, ${packages.length} packages`);
