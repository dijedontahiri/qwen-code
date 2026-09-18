/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { classifySedCommandSafety } from './shell-safety-rules.js';
import { isShellCommandReadOnly } from './shellReadOnlyChecker.js';
import { isShellCommandReadOnlyAST } from './shellAstParser.js';

const safeScript = "'s/a/b/'";

describe('sed long read-only options', () => {
  it.each(['--quiet', '--silent'])('%s matches -n read-only semantics', async (option) => {
    expect(classifySedCommandSafety([option, 's/a/b/', 'file'])).toBe(
      'read-only',
    );

    const command = `sed ${option} ${safeScript} file`;
    expect(isShellCommandReadOnly(command)).toBe(true);
    expect(await isShellCommandReadOnlyAST(command)).toBe(true);
  });

  it.each(['--quiet', '--silent'])('%s still rejects a writing sed script', async (option) => {
    expect(classifySedCommandSafety([option, 'w out', 'file'])).toBe('write');

    const command = `sed ${option} 'w out' file`;
    expect(isShellCommandReadOnly(command)).toBe(false);
    expect(await isShellCommandReadOnlyAST(command)).toBe(false);
  });

  it('keeps near-miss long options conservative', async () => {
    expect(classifySedCommandSafety(['--quiet=x', 's/a/b/', 'file'])).toBe(
      'unknown',
    );
    expect(isShellCommandReadOnly("sed --quiet=x 's/a/b/' file")).toBe(false);
    expect(await isShellCommandReadOnlyAST("sed --quiet=x 's/a/b/' file")).toBe(
      false,
    );
  });
});
