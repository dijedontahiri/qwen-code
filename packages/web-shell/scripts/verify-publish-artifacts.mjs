// Runs from `prepublishOnly`: a published version cannot be replaced, so refuse
// to pack artifacts that consumers could not resolve.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function packedPath(path) {
  return path.replace(/^\.\//, '').split(sep).join('/');
}

export function readPackedFileSet(root) {
  const npmExecPath = process.env['npm_execpath'];
  const command = npmExecPath ? process.execPath : 'npm';
  const args = npmExecPath
    ? [npmExecPath, 'pack', '--dry-run', '--json', '--ignore-scripts']
    : ['pack', '--dry-run', '--json', '--ignore-scripts'];
  const output = execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: !npmExecPath && process.platform === 'win32',
  });
  const packs = JSON.parse(output);
  if (!Array.isArray(packs) || packs.length !== 1 || !Array.isArray(packs[0]?.files)) {
    throw new Error('npm pack did not return one package file list');
  }
  return new Set(packs[0].files.map(({ path }) => packedPath(path)));
}

export function collectPublishProblems(root, manifest, packedFiles) {
  const problems = [];
  const entryPoints = Object.values(manifest.exports).flatMap((entry) =>
    typeof entry === 'string' ? [entry] : Object.values(entry),
  );
  for (const entry of new Set(entryPoints)) {
    if (typeof entry !== 'string' || entry.includes('*')) continue;
    const target = join(root, entry);
    if (!existsSync(target)) {
      problems.push(`missing ${entry}`);
      continue;
    }
    if (!packedFiles.has(packedPath(entry))) {
      problems.push(`${entry} exists but is omitted from npm pack`);
    }
    // The bundles share chunks by relative path. Check both that a referenced
    // chunk was built and that npm's real inclusion rules publish it.
    if (!entry.endsWith('.js')) continue;
    for (const [, specifier] of readFileSync(target, 'utf8').matchAll(
      /(?:from|import\()\s*['"](\.[^'"]+)['"]/g,
    )) {
      const importedTarget = resolve(dirname(target), specifier);
      if (!existsSync(importedTarget)) {
        problems.push(`${entry} imports ${specifier}, which was not built`);
        continue;
      }
      const importedPath = relative(root, importedTarget).split(sep).join('/');
      if (!packedFiles.has(importedPath)) {
        problems.push(
          `${entry} imports ${specifier}, which is omitted from npm pack`,
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
  return problems;
}

export function verifyPublishArtifacts(root = defaultRoot, manifest = pkg) {
  const packedFiles = readPackedFileSet(root);
  return collectPublishProblems(root, manifest, packedFiles);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let problems;
  try {
    problems = verifyPublishArtifacts();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    problems = [`could not inspect npm pack contents: ${message}`];
  }

  if (problems.length > 0) {
    console.error(
      `Refusing to publish @qwen-code/web-shell:\n${problems
        .map((problem) => `  - ${problem}`)
        .join('\n')}`,
    );
    process.exit(1);
  }
}
