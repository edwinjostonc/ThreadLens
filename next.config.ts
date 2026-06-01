import type { NextConfig } from 'next';
import fs from 'fs';

// Windows filesystem is case-insensitive but case-preserving. __dirname and
// process.cwd() may differ in casing from what Node's module resolver returns
// (e.g. "desktop\Reddit" vs "Desktop\Reddit"). When both casings appear in the
// same webpack module identifier, webpack treats them as different modules:
// app-router.js loads twice → two React instances → LayoutRouterContext breaks
// → "invariant expected layout router to be mounted".
//
// Fix: use fs.realpathSync.native to get the OS-canonical path (same casing the
// filesystem actually uses), then normalize both resource.resource AND
// resource.context in afterResolve so all module identifiers share one casing.
const PROJECT_ROOT = (() => {
  try { return fs.realpathSync.native(__dirname); } catch { return __dirname; }
})();
const PROJECT_ROOT_LOWER = PROJECT_ROOT.toLowerCase();

function normalizePath(p: string | undefined): string | undefined {
  if (!p || typeof p !== 'string') return p;
  if (p.toLowerCase().startsWith(PROJECT_ROOT_LOWER)) {
    return PROJECT_ROOT + p.slice(PROJECT_ROOT.length);
  }
  return p;
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['compromise', 'sentiment', '@prisma/client'],
  outputFileTracingRoot: PROJECT_ROOT,
  webpack(config, { webpack }) {
    config.plugins = config.plugins ?? [];

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /.*/,
        (resource: { resource?: string; context?: string }) => {
          resource.resource = normalizePath(resource.resource);
          resource.context = normalizePath(resource.context);
        },
      ),
    );

    return config;
  },
};

export default nextConfig;
