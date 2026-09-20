/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const verifierPath = join(
  repoRoot,
  'packages/web-shell/scripts/verify-publish-artifacts.mjs',
);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'qwen-web-shell-pack-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'dist/nested'), { recursive: true });
  cpSync(verifierPath, join(root, 'scripts/verify-publish-artifacts.mjs'));
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        name: '@qwen-code/web-shell',
        version: '0.0.0-test',
        type: 'module',
        exports: {
          '.': {
            import: './dist/nested/index.js',
          },
        },
        files: ['dist/*.js'],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(root, 'dist/nested/index.js'), 'export const ok = true;\n');
  return root;
}

describe('web-shell publish artifact verifier', () => {
  it('rejects an export target that exists on disk but is omitted from npm pack', () => {
    const root = makeFixture();
    try {
      const packed = JSON.parse(
        execFileSync(
          npmCommand,
          ['pack', '--dry-run', '--json', '--ignore-scripts'],
          { cwd: root, encoding: 'utf8' },
        ),
      );
      expect(packed[0].files.map((entry) => entry.path)).not.toContain(
        'dist/nested/index.js',
      );

      const result = spawnSync(
        process.execPath,
        ['scripts/verify-publish-artifacts.mjs'],
        { cwd: root, encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'missing ./dist/nested/index.js from the packed package',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
