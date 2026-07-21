#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs-extra';
import validateNpmPackageName from 'validate-npm-package-name';

const program = new Command();

program
  .name('create-exodra')
  .description('Create a new Exodra application')
  .version('0.1.0')
  .argument('[project-name]', 'Name of the project')
  .option('--ts, --typescript', 'Use TypeScript')
  .option('--js, --javascript', 'Use JavaScript')
  .option('--tailwind', 'Use Tailwind CSS')
  .option('--eslint', 'Use ESLint')
  .option('--src-dir', 'Use src directory')
  .option('--ssr', 'Scaffold a server-side-rendered app (@exodra/ssr)')
  .option('--no-jsx', 'Author views with h() calls instead of JSX (SSR scaffold)')
  .option('--app', 'Use App Router')
  .option('--import-alias <alias>', 'Import alias to use (default "@/*")')
  .option('--use-npm', 'Use npm')
  .option('--use-yarn', 'Use Yarn')
  .option('--use-pnpm', 'Use pnpm')
  .option('--use-bun', 'Use Bun')
  .action(async (projectName, options) => {
    try {
      await createExodraApp(projectName, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

interface CreateOptions {
  typescript?: boolean;
  javascript?: boolean;
  tailwind?: boolean;
  eslint?: boolean;
  srcDir?: boolean;
  ssr?: boolean;
  jsx?: boolean;
  app?: boolean;
  importAlias?: string;
  useNpm?: boolean;
  useYarn?: boolean;
  usePnpm?: boolean;
  useBun?: boolean;
}

async function createExodraApp(projectName: string | undefined, options: CreateOptions) {
  // Get project name
  if (!projectName) {
    const response = await prompts({
      type: 'text',
      name: 'name',
      message: 'What is your project named?',
      initial: 'my-exodra-app',
      validate: (value) => {
        const validation = validateNpmPackageName(value);
        if (!validation.validForNewPackages) {
          return `Invalid package name: ${validation.errors?.[0] || 'unknown error'}`;
        }
        return true;
      }
    });
    
    if (!response.name) {
      console.log(chalk.red('Project name is required'));
      process.exit(1);
    }
    
    projectName = response.name;
  }

  const projectPath = path.resolve(projectName!);
  
  // Check if directory exists
  if (await fs.pathExists(projectPath)) {
    console.error(chalk.red(`Directory ${projectName} already exists`));
    process.exit(1);
  }

  console.log(chalk.blue(`Creating Exodra app in ${chalk.bold(projectPath)}`));

  // Create project
  await fs.ensureDir(projectPath);
  
  // Simple prompts like Next.js
  const prompts_list: prompts.PromptObject[] = [];
  
  if (options.typescript === undefined && options.javascript === undefined) {
    prompts_list.push({
      type: 'confirm',
      name: 'typescript',
      message: 'Would you like to use TypeScript?',
      initial: true
    });
  }
  
  if (options.eslint === undefined) {
    prompts_list.push({
      type: 'confirm',
      name: 'eslint',
      message: 'Would you like to use ESLint?',
      initial: true
    });
  }
  
  if (options.tailwind === undefined) {
    prompts_list.push({
      type: 'confirm',
      name: 'tailwind',
      message: 'Would you like to use Tailwind CSS?',
      initial: false
    });
  }
  
  if (options.srcDir === undefined) {
    prompts_list.push({
      type: 'confirm',
      name: 'srcDir',
      message: 'Would you like to use `src/` directory?',
      initial: false
    });
  }

  if (options.ssr === undefined) {
    prompts_list.push({
      type: 'confirm',
      name: 'ssr',
      message: 'Would you like server-side rendering (SSR)?',
      initial: false
    });
  }

  if (options.app === undefined) {
    prompts_list.push({
      type: 'confirm',
      name: 'app',
      message: 'Would you like to use App Router?',
      initial: true
    });
  }
  
  if (options.importAlias === undefined) {
    prompts_list.push({
      type: 'text',
      name: 'importAlias',
      message: 'Would you like to customize the default import alias?',
      initial: '@/*'
    });
  }
  
  const answers = prompts_list.length > 0 ? await prompts(prompts_list) : {};
  options = { ...options, ...answers };
  
  const useTypeScript = options.typescript !== false;
  
  await createPackageJson(projectPath, projectName!, useTypeScript, options);
  await createProjectFiles(projectPath, projectName!, useTypeScript, options);
  
  if (options.tailwind) {
    await setupTailwind(projectPath);
  }
  
  if (options.eslint) {
    await setupEslint(projectPath, useTypeScript);
  }
  
  // Create exodra.config.js
  await createExodraConfig(projectPath, options);
  
  // Init git
  await initGit(projectPath);
  
  console.log(chalk.green('✅ Success!') + ` Created ${projectName} at ${projectPath}`);
  console.log();
  console.log('Inside that directory, you can run several commands:');
  console.log();
  console.log(chalk.cyan('  npm run dev'));
  console.log('    Starts the development server.');
  console.log();
  console.log(chalk.cyan('  npm run build'));
  console.log('    Builds the app for production.');
  console.log();
  console.log('We suggest that you begin by typing:');
  console.log();
  console.log(chalk.cyan('  cd'), projectName);
  console.log(chalk.cyan('  npm run dev'));
}

async function createPackageJson(projectPath: string, projectName: string, useTypeScript: boolean, options: CreateOptions) {
  if (options.ssr) {
    return createSsrPackageJson(projectPath, projectName, options.jsx !== false);
  }
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: useTypeScript ? 'tsc && vite build' : 'vite build',
      preview: 'vite preview',
      ...(useTypeScript ? { typecheck: 'tsc --noEmit' } : {}),
      ...(options.eslint ? { lint: 'eslint . --ext ts,tsx,js,jsx --fix' } : {})
    },
    dependencies: {
      '@exodra/core': '^0.1.0',
      '@exodra/jsx': '^0.1.0', 
      '@exodra/dom': '^0.1.0',
      '@exodra/reactivity': '^0.1.0',
      ...(options.app ? { '@exodra/router': '^0.1.0' } : {})
    },
    devDependencies: {
      vite: '^5.0.0',
      '@vitejs/plugin-react': '^4.2.0',
      '@exodra/babel-plugin-jsx': '^0.1.0',
      '@exodra/vite-plugin': '^0.1.0',
      ...(useTypeScript ? {
        typescript: '^5.3.3',
        '@types/node': '^20.0.0'
      } : {}),
      ...(options.tailwind ? {
        tailwindcss: '^3.4.0',
        autoprefixer: '^10.4.16',
        postcss: '^8.4.32'
      } : {}),
      ...(options.eslint ? {
        eslint: '^8.56.0',
        ...(useTypeScript ? {
          '@typescript-eslint/eslint-plugin': '^6.19.0',
          '@typescript-eslint/parser': '^6.19.0'
        } : {})
      } : {})
    }
  };

  await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
}

async function createProjectFiles(projectPath: string, projectName: string, useTypeScript: boolean, options: CreateOptions) {
  if (options.ssr) {
    return createSsrFiles(projectPath, projectName, options.jsx !== false);
  }
  const ext = useTypeScript ? 'ts' : 'js';
  const jsxExt = useTypeScript ? 'tsx' : 'jsx';

  // Create src directory
  await fs.ensureDir(path.join(projectPath, 'src'));

  // Create main app file  
  const srcPath = options.srcDir ? path.join(projectPath, 'src') : projectPath;
  await fs.ensureDir(srcPath);
  
  let appContent: string;
  
  if (options.app) {
    // Create pages directory
    await fs.ensureDir(path.join(projectPath, 'src/pages'));
    
    // Home page (index.tsx for file-based routing)
    const homeContent = `export default function HomePage() {
  return (
    <div className="container">
      <h1>Welcome to ${projectName}</h1>
      <p>Your Exodra app with routing is ready!</p>
      <a href="/about">Go to About</a>
    </div>
  );
}
`;
    await fs.writeFile(path.join(projectPath, `src/pages/index.${jsxExt}`), homeContent);
    
    // About page
    const aboutContent = `export default function AboutPage() {
  return (
    <div className="container">
      <h1>About</h1>
      <p>This is the about page.</p>
      <a href="/">Back to Home</a>
    </div>
  );
}
`;
    await fs.writeFile(path.join(projectPath, `src/pages/about.${jsxExt}`), aboutContent);
    
    // Create API directory with example
    await fs.ensureDir(path.join(srcPath, 'api'));
    const apiExample = `// Example API route
export async function GET(_request${useTypeScript ? ': Request' : ''}) {
  return new Response(JSON.stringify({
    message: 'Hello from Exodra API',
    time: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request${useTypeScript ? ': Request' : ''}) {
  const body = await request.json();
  return new Response(JSON.stringify({
    message: 'Data received',
    echo: body
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
`;
    await fs.writeFile(path.join(srcPath, 'api', `hello.${ext}`), apiExample);
    
    // Main with router
    appContent = `import { mount } from '@exodra/dom';
import { createRouter, RouterProvider, Outlet } from '@exodra/router';
import { routes } from 'virtual:exodra-routes';

const router = createRouter(routes);

function App() {
  return (
    <RouterProvider router={router}>
      <Outlet />
    </RouterProvider>
  );
}

mount(<App />, document.getElementById('app')!);
`;
  } else {
    appContent = `import { mount } from '@exodra/dom';
${options.tailwind ? "import './styles.css';\n" : ''}
function App() {
  return (
    <div className="${options.tailwind ? 'min-h-screen bg-gray-50 py-12 px-4' : 'app'}">
      <h1 className="${options.tailwind ? 'text-4xl font-bold text-center mb-4' : ''}">
        Welcome to ${projectName}
      </h1>
      <p className="${options.tailwind ? 'text-lg text-center text-gray-600' : ''}">
        Your Exodra app is ready!
      </p>
    </div>
  );
}

mount(<App />, document.getElementById('app')!);
`;
  }

  // main always contains JSX, so it must use the JSX extension (.tsx/.jsx)
  await fs.writeFile(path.join(projectPath, `src/main.${jsxExt}`), appContent);
  
  if (options.tailwind) {
    const stylesContent = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
    await fs.writeFile(path.join(projectPath, 'src/styles.css'), stylesContent);
  }

  // Create index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.${jsxExt}"></script>
</body>
</html>
`;

  await fs.writeFile(path.join(projectPath, 'index.html'), htmlContent);

  // Create vite config with Exodra and React plugin for Babel
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@exodra/babel-plugin-jsx', { importSource: '@exodra/core' }]
        ]
      }
    }),
    exodra({
      pagesDir: '${options.srcDir ? 'src/pages' : 'pages'}',
      apiDir: '${options.srcDir ? 'src/api' : 'api'}',
      ssr: false
    })
  ]
});
`;

  await fs.writeFile(path.join(projectPath, 'vite.config.js'), viteConfig);

  if (useTypeScript) {
    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'preserve', // Babel will handle JSX transformation
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        ...(options.importAlias ? {
          paths: {
            [options.importAlias.replace('/*', '/*')]: ['./src/*']
          }
        } : {})
      },
      include: ['src', 'vite-env.d.ts']
    };

    await fs.writeJSON(path.join(projectPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
    
    // Create vite-env.d.ts
    const viteEnv = `/// <reference types="vite/client" />

declare module 'virtual:exodra-routes' {
  import type { TExoRoute } from '@exodra/router';
  export const routes: TExoRoute[];
}
`;
    await fs.writeFile(path.join(projectPath, 'vite-env.d.ts'), viteEnv);
  }
  
  // Create .gitignore
  const gitignoreContent = `node_modules
dist
.DS_Store
*.local
.env*.local
`;
  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
}

async function createExodraConfig(_projectPath: string, _options: CreateOptions) {
  // We don't need exodra.config.js anymore since everything is in vite.config.js
  // Skip creating this file
}

async function createSsrPackageJson(projectPath: string, projectName: string, useJsx: boolean) {
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx server/dev-server.ts',
      build:
        'tsc --noEmit && vite build --outDir dist/client && vite build --ssr src/entry-server.ts --outDir dist/server',
      serve: 'NODE_ENV=production tsx server/prod-server.ts',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      '@exodra/core': '^0.1.0',
      '@exodra/dom': '^0.1.0',
      '@exodra/reactivity': '^0.1.0',
      '@exodra/ssr': '^0.1.0',
      '@exodra/string': '^0.1.0',
    },
    devDependencies: {
      '@types/express': '^5.0.0',
      '@types/node': '^20.0.0',
      express: '^5.0.0',
      tsx: '^4.19.0',
      typescript: '^5.3.3',
      vite: '^5.4.0',
      // JSX views are compiled by the Exodra babel plugin via a small vite plugin.
      ...(useJsx
        ? {
            '@babel/core': '^7.24.0',
            '@babel/plugin-syntax-jsx': '^7.24.0',
            '@babel/preset-typescript': '^7.24.0',
            '@exodra/babel-plugin-jsx': '^0.1.0',
          }
        : {}),
    },
  };
  await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
}

// Scaffold a server-side-rendered app: @exodra/ssr renders the body + a state
// script, and the client hydrates. Views use direct h() calls (the stable
// underlying form) so the same definition runs under tsx (SSR) and vite (client)
// without a JSX transform step.
async function createSsrFiles(projectPath: string, projectName: string, useJsx: boolean) {
  await fs.ensureDir(path.join(projectPath, 'src'));
  await fs.ensureDir(path.join(projectPath, 'server'));

  if (useJsx) {
    await fs.writeFile(
      path.join(projectPath, 'src/app.tsx'),
      `import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';

// JSX is compiled by @exodra/babel-plugin-jsx: regular attributes bucket into
// \`static\`, reactive props use bindable={{...}} / bindableList={{...}}. The
// plugin auto-imports h/text. The same App() renders on the server and hydrates
// on the client.
export function App(): TExoSchema {
    const count = bindable(0);
    return (
        <div id="app">
            <h1>Welcome to ${projectName}</h1>
            <p>Server-rendered with @exodra/ssr, hydrated on the client.</p>
            <button onClick={() => count.setValue(count.getValue() + 1)}>
                Clicked <strong bindable={{ textContent: count }} /> times
            </button>
        </div>
    );
}
`
    );
  } else {
    await fs.writeFile(
      path.join(projectPath, 'src/app.ts'),
      `import { h, text } from '@exodra/core';
import { bindable } from '@exodra/reactivity';

// Reactive state lives in bindables; the same App() renders on the server
// (to HTML) and hydrates on the client (wiring events + reactivity).
export function App() {
    const count = bindable(0);
    return h('div', {
        static: {
            id: 'app',
            children: [
                h('h1', { static: { children: text('Welcome to ${projectName}') } }),
                h('p', {
                    static: {
                        children: text(
                            'Server-rendered with @exodra/ssr, hydrated on the client.'
                        ),
                    },
                }),
                h('button', {
                    static: {
                        type: 'button',
                        onClick: () => count.setValue(count.getValue() + 1),
                        children: [
                            text('Clicked '),
                            h('strong', { bindables: { textContent: count } }),
                            text(' times'),
                        ],
                    },
                }),
            ],
        },
    });
}
`
    );
  }

  await fs.writeFile(
    path.join(projectPath, 'src/entry-server.ts'),
    `import { ExoNodeSsr } from '@exodra/ssr';
import { App } from './app';

// ExoNodeSsr renders the body and can carry serializable state in an embedded
// <script id="__EXODRA_STATE__"> for the client to read on hydration.
export function render() {
    const ssr = new ExoNodeSsr(App());
    return { appHtml: ssr.renderBody(), stateScript: ssr.renderStateScript() };
}
`
  );

  await fs.writeFile(
    path.join(projectPath, 'src/entry-client.ts'),
    `import { hydrate } from '@exodra/dom';
import { App } from './app';

const root = document.getElementById('app');
if (root) {
    hydrate(App(), root);
}
`
  );

  await fs.writeFile(
    path.join(projectPath, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
</head>
<body>
  <!--app-html-->
  <!--app-state-->
  <script type="module" src="/src/entry-client.ts"></script>
</body>
</html>
`
  );

  await fs.writeFile(
    path.join(projectPath, 'vite.config.ts'),
    useJsx
      ? `import { defineConfig, type Plugin } from 'vite';
import * as babel from '@babel/core';
import exodraJsx from '@exodra/babel-plugin-jsx';

// Compile .tsx/.jsx via @exodra/babel-plugin-jsx in every vite path (client
// build, dev SSR via ssrLoadModule, prod SSR build).
function exodraJsxPlugin(): Plugin {
    return {
        name: 'exodra-jsx',
        enforce: 'pre',
        transform(code, id) {
            if (!/\\.[jt]sx$/.test(id) || id.includes('node_modules')) return;
            const result = babel.transformSync(code, {
                filename: id,
                sourceMaps: true,
                babelrc: false,
                configFile: false,
                presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
                plugins: [['@babel/plugin-syntax-jsx'], exodraJsx],
            });
            if (!result?.code) return undefined;
            return { code: result.code, map: result.map ?? undefined };
        },
    };
}

export default defineConfig({
    appType: 'custom',
    build: { emptyOutDir: false },
    plugins: [exodraJsxPlugin()],
});
`
      : `import { defineConfig } from 'vite';

// Views use explicit h() calls (no JSX), so no JSX plugin is needed.
export default defineConfig({ appType: 'custom', build: { emptyOutDir: false } });
`
  );

  await fs.writeFile(
    path.join(projectPath, 'server/dev-server.ts'),
    `import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 5173);

async function main() {
    const app = express();
    const vite = await createViteServer({
        root: projectRoot,
        server: { middlewareMode: true },
        appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(/.*/, async (req, res) => {
        try {
            const template = await vite.transformIndexHtml(
                req.originalUrl,
                fs.readFileSync(path.resolve(projectRoot, 'index.html'), 'utf-8')
            );
            const { render } = (await vite.ssrLoadModule('/src/entry-server.ts')) as {
                render: () => { appHtml: string; stateScript: string };
            };
            const { appHtml, stateScript } = render();
            const html = template
                .replace('<!--app-html-->', appHtml)
                .replace('<!--app-state-->', stateScript);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (err) {
            vite.ssrFixStacktrace(err as Error);
            res.status(500).end((err as Error).message);
        }
    });

    app.listen(PORT, () => console.log(\`dev server: http://localhost:\${PORT}\`));
}

main();
`
  );

  await fs.writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          types: ['node'],
          ...(useJsx ? { jsx: 'react-jsx', jsxImportSource: '@exodra/jsx' } : {}),
        },
        include: ['src'],
      },
      null,
      2
    )
  );

  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    'node_modules\ndist\n.DS_Store\n*.local\n.env*.local\n'
  );
}

async function setupTailwind(projectPath: string) {
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
  await fs.writeFile(path.join(projectPath, 'tailwind.config.js'), tailwindConfig);
  
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
  await fs.writeFile(path.join(projectPath, 'postcss.config.js'), postcssConfig);
}

async function setupEslint(projectPath: string, useTypeScript: boolean) {
  const eslintConfig = {
    env: {
      browser: true,
      es2020: true
    },
    extends: [
      'eslint:recommended',
      ...(useTypeScript ? [
        'plugin:@typescript-eslint/recommended'
      ] : [])
    ],
    ...(useTypeScript ? {
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint']
    } : {}),
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn'
    }
  };
  
  await fs.writeJSON(path.join(projectPath, '.eslintrc.json'), eslintConfig, { spaces: 2 });
}

async function initGit(projectPath: string) {
  const { execSync } = await import('child_process');
  try {
    execSync('git init', { cwd: projectPath, stdio: 'ignore' });
    execSync('git add -A', { cwd: projectPath, stdio: 'ignore' });
    execSync('git commit -m "Initial commit from create-exodra"', { cwd: projectPath, stdio: 'ignore' });
  } catch (e) {
    // Git init failed, ignore
  }
}