import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { shouldExternalizeWebShellDependency } from '../build-boundary';
import libraryConfig from '../vite.lib.config';

const runtimePackages = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

describe('web-shell package build boundary', () => {
  it('externalizes every declared runtime package and its JavaScript subpaths', () => {
    for (const packageName of runtimePackages) {
      expect(shouldExternalizeWebShellDependency(packageName)).toBe(true);
      expect(
        shouldExternalizeWebShellDependency(`${packageName}/internal`),
      ).toBe(true);
    }
  });

  it('keeps dependency stylesheet entrypoints bundled', () => {
    expect(
      shouldExternalizeWebShellDependency('@xterm/xterm/css/xterm.css'),
    ).toBe(false);
    expect(
      shouldExternalizeWebShellDependency('katex/dist/katex.min.css'),
    ).toBe(false);
    expect(
      shouldExternalizeWebShellDependency('mermaid/dist/mermaid.css'),
    ).toBe(false);
  });

  it('does not externalize local or undeclared modules', () => {
    expect(shouldExternalizeWebShellDependency('./client/index')).toBe(false);
    expect(
      shouldExternalizeWebShellDependency('not-a-web-shell-dependency'),
    ).toBe(false);
    expect(shouldExternalizeWebShellDependency('react-extra')).toBe(false);
  });

  it.each(['production', 'transcript'])(
    'externalizes MCP Apps in the public %s build mode',
    async (mode) => {
      if (typeof libraryConfig !== 'function') {
        throw new Error('Expected a mode-aware library configuration');
      }
      const config = await libraryConfig({ command: 'build', mode });
      const external = config.build?.rollupOptions?.external;
      if (typeof external !== 'function') {
        throw new Error('Expected an external dependency matcher');
      }
      for (const id of [
        '@modelcontextprotocol/ext-apps',
        '@modelcontextprotocol/ext-apps/app-bridge',
      ]) {
        expect(external(id, undefined, false)).toBe(true);
      }
      for (const stylesheet of [
        'katex/dist/katex.min.css',
        '@xterm/xterm/css/xterm.css',
        'mermaid/dist/mermaid.css',
      ]) {
        expect(external(stylesheet, undefined, false)).toBe(false);
      }
    },
  );
});
