import { describe, expect, it } from 'vitest';
import pkg from './package.json' with { type: 'json' };
import { isWebShellLibExternal } from './vite.lib.externals';

describe('isWebShellLibExternal', () => {
  it('externalizes every declared runtime and peer dependency', () => {
    for (const dependency of [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ]) {
      expect(isWebShellLibExternal(dependency), dependency).toBe(true);
    }
  });

  it('externalizes dependency subpaths', () => {
    expect(isWebShellLibExternal('react/jsx-runtime')).toBe(true);
    expect(isWebShellLibExternal('react-dom/client')).toBe(true);
    expect(isWebShellLibExternal('@qwen-code/sdk/daemon')).toBe(true);
    expect(isWebShellLibExternal('@xterm/xterm/lib/xterm.js')).toBe(true);
    expect(isWebShellLibExternal('@modelcontextprotocol/ext-apps/client')).toBe(
      true,
    );
  });

  it('keeps stylesheet imports bundled', () => {
    expect(isWebShellLibExternal('katex/dist/katex.min.css')).toBe(false);
    expect(isWebShellLibExternal('@xterm/xterm/css/xterm.css')).toBe(false);
  });

  it('keeps local modules bundled', () => {
    expect(isWebShellLibExternal('./client/index.tsx')).toBe(false);
    expect(isWebShellLibExternal('@/components/ui/button')).toBe(false);
  });
});
