import { defineConfig } from 'vite';

// Views use explicit h() calls (no JSX), so no JSX plugin is needed.
export default defineConfig({ appType: 'custom', build: { emptyOutDir: false } });
