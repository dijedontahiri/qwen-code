/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { classifySedCommandSafety } from './shell-safety-rules.js';
import {
  _resetParser,
  initParser,
  isShellCommandReadOnlyAST,
} from './shellAstParser.js';
import { isShellCommandReadOnly } from './shellReadOnlyChecker.js';

beforeAll(async () => {
  await initParser();
});

afterAll(() => {
  _resetParser();
});

describe('sed long quiet options (#12215)', () => {
  it.each(['--quiet', '--silent'])(
    'treats %s as the read-only alias of -n',
    async (option) => {
      expect(
        classifySedCommandSafety([option, 's/a/b/', 'file']),
      ).toBe('read-only');

      const command = `sed ${option} 's/a/b/' file`;
      expect(isShellCommandReadOnly(command)).toBe(true);
      expect(await isShellCommandReadOnlyAST(command)).toBe(true);
    },
  );

  it.each(['--quiet', '--silent'])(
    'does not hide a write command behind %s',
    async (option) => {
      expect(classifySedCommandSafety([option, 'w out', 'file'])).toBe('write');

      const command = `sed ${option} 'w out' file`;
      expect(isShellCommandReadOnly(command)).toBe(false);
      expect(await isShellCommandReadOnlyAST(command)).toBe(false);
    },
  );

  it.each(['--quiet=x', '--silentx'])(
    'keeps unsupported near-miss %s conservative',
    (option) => {
      expect(classifySedCommandSafety([option, 's/a/b/', 'file'])).toBe(
        'unknown',
      );
    },
  );
});
