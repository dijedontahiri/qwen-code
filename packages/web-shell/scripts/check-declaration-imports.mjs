import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const typesRoot = resolve(packageRoot, 'dist/types');
const offenders = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    if (!entry.name.endsWith('.d.ts')) {
      continue;
    }

    const content = await readFile(path, 'utf8');
    if (content.includes("'@/") || content.includes('"@/')) {
      offenders.push(relative(typesRoot, path));
    }
  }
}

await scan(typesRoot);

if (offenders.length > 0) {
  throw new Error(
    `Published declarations contain repo-only @/ imports:\n${offenders.join('\n')}`,
  );
}
