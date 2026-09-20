// Runs from `prepublishOnly`: a published version cannot be replaced, so refuse
// to pack artifacts that consumers could not resolve.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function packagePath(path) {
  return path.replaceAll(sep, '/').replace(/^\.\//, '');
}

function packedFiles() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(
    npm,
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.error) {
    problems.push(`could not inspect npm pack contents: ${result.error.message}`);
    return undefined;
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    problems.push(
      `could not inspect npm pack contents${detail ? `: ${detail}` : ''}`,
    );
    return undefined;
  }

  try {
    const pack = JSON.parse(result.stdout);
    const files = pack[0]?.files;
    if (!Array.isArray(files)) throw new Error('npm returned no file list');
    return new Set(files.map((file) => packagePath(file.path)));
  } catch (error) {
    problems.push(`could not parse npm pack contents: ${error.message}`);
    return undefined;
  }
}

const packed = packedFiles();
const entryPoints = Object.values(pkg.exports).flatMap((entry) =>
  typeof entry === 'string' ? [entry] : Object.values(entry),
);
for (const entry of new Set(entryPoints)) {
  const target = join(root, entry);
  if (!existsSync(target)) {
    problems.push(`missing ${entry}`);
    continue;
  }
  if (packed && !packed.has(packagePath(entry))) {
    problems.push(`${entry} was built but is not included in npm pack`);
  }
  // The bundles share chunks by relative path, and `files` publishes them by
  // globbing `dist/*.js`. A chunk emitted into a subdirectory would be
  // announced by an entry point but never packed.
  if (!entry.endsWith('.js')) continue;
  for (const [, specifier] of readFileSync(target, 'utf8').matchAll(
    /(?:from|import\()\s*['"](\.[^'"]+)['"]/g,
  )) {
    const dependency = resolve(dirname(target), specifier);
    if (!existsSync(dependency)) {
      problems.push(`${entry} imports ${specifier}, which was not built`);
      continue;
    }
    if (packed) {
      const dependencyPath = packagePath(relative(root, dependency));
      if (!packed.has(dependencyPath)) {
        problems.push(
          `${entry} imports ${specifier}, which is not included in npm pack`,
        );
      }
    }
  }
}

// Declarations ship verbatim, so they must not import through the alias that
// only this repository resolves.
const typesDir = join(root, 'dist/types');
if (existsSync(typesDir)) {
  for (const name of readdirSync(typesDir, { recursive: true })) {
    if (!name.endsWith('.d.ts')) continue;
    const source = readFileSync(join(typesDir, name), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const [, specifier] of source.matchAll(
      /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g,
    )) {
      if (specifier.startsWith('@/')) {
        problems.push(`dist/types/${name} imports the repo-only ${specifier}`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Refusing to publish @qwen-code/web-shell:\n${problems
      .map((problem) => `  - ${problem}`)
      .join('\n')}`,
  );
  process.exit(1);
}
