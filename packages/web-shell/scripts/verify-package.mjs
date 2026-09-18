import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(
  readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
);
const failures = [];

function collectExportTargets(value, targets = new Set()) {
  if (typeof value === 'string') {
    if (value.startsWith('./')) targets.add(value.slice(2));
    return targets;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectExportTargets(nested, targets);
    }
  }
  return targets;
}

for (const target of collectExportTargets(packageJson.exports)) {
  if (!existsSync(resolve(packageRoot, target))) {
    failures.push(`missing package export target: ${target}`);
  }
}

function declarationFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return declarationFiles(path);
    return entry.isFile() && entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

for (const declaration of declarationFiles(resolve(packageRoot, 'dist/types'))) {
  const source = readFileSync(declaration, 'utf8');
  if (/['"]@\//.test(source)) {
    failures.push(
      `repository-only @/ import leaked into ${declaration.slice(packageRoot.length + 1)}`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[web-shell package] ${failure}`);
  process.exitCode = 1;
} else {
  console.log('[web-shell package] export targets and declarations verified');
}
