/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { verifyPublishArtifacts } from '../../packages/web-shell/scripts/verify-publish-artifacts.mjs';

function verifyFixture({ exports, files, artifacts }) {
  const root = mkdtempSync(path.join(tmpdir(), 'web-shell-pack-'));
  const pkg = {
    name: 'web-shell-pack-fixture',
    version: '1.0.0',
    type: 'module',
    exports,
    files,
  };

  try {
    writeFileSync(
      path.join(root, 'package.json'),
      `${JSON.stringify(pkg, null, 2)}\n`,
    );
    for (const [relativePath, contents] of Object.entries(artifacts)) {
      const target = path.join(root, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    return verifyPublishArtifacts(root, pkg);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('web-shell publish artifact verifier', () => {
  it('rejects an export target that exists on disk but is omitted from npm pack', () => {
    const problems = verifyFixture({
      exports: { '.': { import: './dist/nested/index.js' } },
      files: ['dist/*.js'],
      artifacts: {
        'dist/nested/index.js': 'export const value = 1;\n',
      },
    });

    expect(problems).toContain(
      './dist/nested/index.js was built but is not included by npm pack',
    );
    expect(problems).not.toContain('missing ./dist/nested/index.js');
  });

  it('rejects a relative chunk that exists on disk but is omitted from npm pack', () => {
    const problems = verifyFixture({
      exports: { '.': { import: './dist/index.js' } },
      files: ['dist/*.js'],
      artifacts: {
        'dist/index.js': "export { value } from './nested/chunk.js';\n",
        'dist/nested/chunk.js': 'export const value = 1;\n',
      },
    });

    expect(problems).toContain(
      './dist/index.js imports ./nested/chunk.js, which was built but is not included by npm pack',
    );
  });

  it('accepts exports and relative chunks that npm will include', () => {
    const problems = verifyFixture({
      exports: { '.': { import: './dist/index.js' } },
      files: ['dist/*.js'],
      artifacts: {
        'dist/index.js': "export { value } from './chunk.js';\n",
        'dist/chunk.js': 'export const value = 1;\n',
      },
    });

    expect(problems).toEqual([]);
  });
});
