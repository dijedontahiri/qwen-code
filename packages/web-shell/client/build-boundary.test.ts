import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { shouldExternalizeWebShellDependency } from '../build-boundary';

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
    for (const isTranscriptBuild of [false, true]) {
      expect(
        shouldExternalizeWebShellDependency(
          '@xterm/xterm/css/xterm.css',
          isTranscriptBuild,
        ),
      ).toBe(false);
      expect(
        shouldExternalizeWebShellDependency(
          'katex/dist/katex.min.css',
          isTranscriptBuild,
        ),
      ).toBe(false);
    }
  });

  it('does not externalize local or undeclared modules', () => {
    expect(shouldExternalizeWebShellDependency('./client/index')).toBe(false);
    expect(shouldExternalizeWebShellDependency('not-a-web-shell-dependency')).toBe(
      false,
    );
  });

  it('preserves MCP App tree shaking in the transcript build only', () => {
    for (const id of [
      '@modelcontextprotocol/ext-apps',
      '@modelcontextprotocol/ext-apps/app-bridge',
    ]) {
      expect(shouldExternalizeWebShellDependency(id, true)).toBe(false);
      expect(shouldExternalizeWebShellDependency(id, false)).toBe(true);
    }
  });

  it('keeps other declared runtime packages external in the transcript build', () => {
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
