import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { shouldExternalizeWebShellDependency } from '../build-boundary';
import libraryConfig from '../vite.lib.config';

describe('web-shell package build boundary', () => {
  it('externalizes every declared runtime package and its JavaScript subpaths', () => {
    const runtimePackages = [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ];

    for (const packageName of runtimePackages) {
      expect(shouldExternalizeWebShellDependency(packageName)).toBe(true);
      expect(
        shouldExternalizeWebShellDependency(`${packageName}/internal`),
      ).toBe(true);
    }
  });

  it('keeps stylesheet entrypoints bundled in both build modes', () => {
    for (const isDocumentExport of [false, true]) {
      expect(
        shouldExternalizeWebShellDependency(
          '@xterm/xterm/css/xterm.css',
          isDocumentExport,
        ),
      ).toBe(false);
      expect(
        shouldExternalizeWebShellDependency(
          'katex/dist/katex.min.css',
          isDocumentExport,
        ),
      ).toBe(false);
    }
  });

  it('does not externalize local or undeclared modules', () => {
    expect(shouldExternalizeWebShellDependency('./client/index')).toBe(false);
    expect(
      shouldExternalizeWebShellDependency('not-a-web-shell-dependency'),
    ).toBe(false);
  });

  it('preserves MCP App tree shaking in the private document build only', () => {
    for (const id of [
      '@modelcontextprotocol/ext-apps',
      '@modelcontextprotocol/ext-apps/app-bridge',
    ]) {
      expect(shouldExternalizeWebShellDependency(id, true)).toBe(false);
      expect(shouldExternalizeWebShellDependency(id, false)).toBe(true);
    }
  });

  it('keeps other declared runtime packages external in the private document build', () => {
    const runtimePackages = [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ];

    for (const packageName of runtimePackages) {
      if (packageName === '@modelcontextprotocol/ext-apps') continue;
      expect(shouldExternalizeWebShellDependency(packageName, true)).toBe(true);
      expect(
        shouldExternalizeWebShellDependency(`${packageName}/internal`, true),
      ).toBe(true);
    }
  });
});

describe('public and private Web Shell library modes', () => {
  it.each(['production', 'transcript'])(
    'keeps MCP Apps external in public %s output',
    async (mode) => {
      if (typeof libraryConfig !== 'function')
        throw new Error('Expected a mode-aware library configuration');
      const config = await libraryConfig({ command: 'build', mode });
      const external = config.build?.rollupOptions?.external;
      if (typeof external !== 'function')
        throw new Error('Expected an external dependency matcher');
      expect(
        external('@modelcontextprotocol/ext-apps/app-bridge', undefined, false),
      ).toBe(true);
      expect(config.build?.outDir).toBe('dist');
    },
  );
  it('isolates tree-shaken document output from published entrypoints', async () => {
    if (typeof libraryConfig !== 'function')
      throw new Error('Expected a mode-aware library configuration');
    const config = await libraryConfig({
      command: 'build',
      mode: 'document-export',
    });
    const external = config.build?.rollupOptions?.external;
    if (typeof external !== 'function')
      throw new Error('Expected an external dependency matcher');
    expect(
      external('@modelcontextprotocol/ext-apps/app-bridge', undefined, false),
    ).toBe(false);
    expect(external('react', undefined, false)).toBe(true);
    expect(config.build?.outDir).toBe('dist/document-export');
    expect(config.build?.lib).toMatchObject({
      entry: { transcript: 'client/transcript.ts' },
    });
  });
});
