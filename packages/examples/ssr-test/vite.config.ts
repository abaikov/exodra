import { defineConfig } from 'vite';

// The app is written directly against the schema core (`createExoSchema` + `createExoMachine`), so there is no JSX and
// no compiler plugin in this build.
export default defineConfig({ appType: 'custom', build: { emptyOutDir: false } });
