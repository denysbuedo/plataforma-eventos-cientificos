process.env.NEXT_TELEMETRY_DISABLED = '1';
export default { distDir:process.env.SEP_NEXT_DIST_DIR??'.next', poweredByHeader: false, transpilePackages: ['@sep/ui', '@sep/web-server', '@sep/i18n'], experimental: { cpus: 2 } };
