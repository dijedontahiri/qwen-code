import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const DIST_DIR = resolve(__dirname, '../dist');

function readEntry(entry: 'index' | 'transcript'): string {
  return readFileSync(resolve(DIST_DIR, `${entry}.js`), 'utf8');
}

function readInjectedCss(bundle: string): string {
  const match = bundle.match(/^const __qwenWebShellCss=("(?:[^"\\]|\\.)*");/);
  if (!match?.[1]) throw new Error('Injected component CSS not found');
  return JSON.parse(match[1]) as string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectExternal(bundle: string, dependency: string): void {
  const packageSpecifier = new RegExp(
    `from "${escapeRegExp(dependency)}(?:/[^"]*)?"`,
  );
  expect(bundle, `${dependency} should remain external`).toMatch(
    packageSpecifier,
  );
}

describe('build artifact — manifest-derived externals', () => {
  it('keeps declared runtime dependencies external in the interactive entry', () => {
    const bundle = readEntry('index');
    for (const dependency of [
      '@modelcontextprotocol/ext-apps',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      '@xterm/addon-fit',
      '@xterm/xterm',
      'fzf',
    ]) {
      expectExternal(bundle, dependency);
    }
  });

  it('keeps MCP Apps external in the transcript entry consumed by document export', () => {
    const bundle = readEntry('transcript');
    expectExternal(bundle, '@modelcontextprotocol/ext-apps/app-bridge');
    expectExternal(bundle, '@tanstack/react-virtual');
  });

  it('ships scoped xterm styles in the interactive library entry', () => {
    let xtermRule: Rule | undefined;
    postcss.parse(readInjectedCss(readEntry('index'))).walkRules((rule) => {
      if (rule.selector.includes('.xterm')) xtermRule ??= rule;
    });

    expect(xtermRule, 'xterm CSS missing from dist/index.js').toBeDefined();
    expect(xtermRule?.selector).toContain('[data-web-shell-root]');
  });
});
