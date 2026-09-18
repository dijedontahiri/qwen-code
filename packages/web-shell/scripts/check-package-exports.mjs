import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifest = JSON.parse(
  await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
);
const missing = [];

for (const [exportName, conditions] of Object.entries(manifest.exports ?? {})) {
  for (const [condition, target] of Object.entries(conditions)) {
    if (typeof target !== 'string') {
      continue;
    }

    const path = resolve(packageRoot, target);
    try {
      await access(path);
    } catch {
      missing.push(`${exportName} (${condition}) -> ${target}`);
    }
  }
}

if (missing.length > 0) {
  throw new Error(
    `Package exports reference missing files:\n${missing.join('\n')}`,
  );
}
