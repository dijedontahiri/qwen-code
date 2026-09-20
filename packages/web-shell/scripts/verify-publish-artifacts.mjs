// Runs from `prepublishOnly`: a published version cannot be replaced, so refuse
// to pack artifacts that consumers could not resolve.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packResult = spawnSync(
  npmCommand,
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let packedPaths;
if (packResult.error) {
  problems.push(`could not inspect npm pack output: ${packResult.error.message}`);
} else if (packResult.status !== 0) {
  problems.push(
    `could not inspect npm pack output (exit ${packResult.status}): ${(
      packResult.stderr || packResult.stdout
    ).trim()}`,
  );
} else {
  try {
    const packOutput = JSON.parse(packResult.stdout);
    if (!Array.isArray(packOutput) || packOutput.length !== 1) {
      throw new Error('npm pack did not describe exactly one package');
    }
    packedPaths = new Set(
      packOutput[0].files.map((file) => file.path.replaceAll('\\', '/')),
    );
  } catch (error) {
    problems.push(
      `could not parse npm pack output: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const packagePath = (target) => relative(root, target).split(sep).join('/');
const entryPoints = Object.values(pkg.exports).flatMap((entry) =>
  typeof entry === 'string' ? [entry] : Object.values(entry),
);
for (const entry of new Set(entryPoints)) {
  const target = join(root, entry);
  if (!existsSync(target)) {
    problems.push(`missing ${entry}`);
    continue;
  }
  if (packedPaths && !packedPaths.has(packagePath(target))) {
    problems.push(`missing ${entry} from the packed package`);
    continue;
  }
  // The bundles share chunks by relative path, and `files` publishes them by
  // globbing `dist/*.js`. A chunk emitted into a subdirectory would be
  // announced by an entry point but never packed.
  if (!entry.endsWith('.js')) continue;
  for (const [, specifier] of readFileSync(target, 'utf8').matchAll(
    /(?:from\s+|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/g,
  )) {
    const importedTarget = resolve(dirname(target), specifier);
    if (!existsSync(importedTarget)) {
      problems.push(`${entry} imports ${specifier}, which was not built`);
    } else if (packedPaths && !packedPaths.has(packagePath(importedTarget))) {
      problems.push(
        `${entry} imports ${specifier}, which is not included in the packed package`,
      );
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
