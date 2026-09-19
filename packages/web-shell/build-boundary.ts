import pkg from './package.json' with { type: 'json' };

const runtimePackages = new Set([
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]);

export function shouldExternalizeWebShellDependency(id: string): boolean {
  // The published package ships only JavaScript and declarations. Dependency
  // styles therefore have to pass through the library CSS pipeline so they
  // are scoped and injected with the Web Shell bundle rather than surviving
  // as bare CSS imports that consumers cannot resolve from this package.
  if (id.endsWith('.css')) {
    return false;
  }

  for (const packageName of runtimePackages) {
    if (id === packageName || id.startsWith(`${packageName}/`)) {
      return true;
    }
  }

  return false;
}
