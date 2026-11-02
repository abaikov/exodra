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
    .option('--ssr', 'Scaffold a server-side-rendered app (@exodra/string + hydration)')
    // `--no-ssr` EXISTS SO THE DEFAULT PATH CAN BE SCRIPTED AT ALL.
    //
    // Every other choice here has a flag that answers its prompt in both directions —
    // `--ts`/`--js`, and commander turns a declared `--no-x` into `x: false`. SSR had only the
    // positive one, so `options.ssr` stayed `undefined` unless the caller wanted SSR, the prompt
    // below fired, and the process waited for a keystroke that never comes in CI.
    //
    // The consequence was not a missing flag but a BLIND SPOT: the SPA scaffold — the one a user
    // gets by answering "no", and the only one that declares `@exodra/router` and
    // `@exodra/vite-plugin` — could not be run unattended, so nothing ever ran it. Its first
    // unattended execution was the test that found this.
    .option('--no-ssr', 'Scaffold a client-only app (the default), without being asked')
    // `--no-git` EXISTS BECAUSE SCAFFOLDING IS NOT ALWAYS THE START OF A REPOSITORY.
    //
    // `initGit` runs `git init`, `git add -A` and `git commit` unconditionally. That is right for
    // a person starting a project in an empty folder and wrong everywhere else: inside an existing
    // repository it makes a nested one, in CI it can block on a missing identity, and in this
    // package's OWN TEST it means running the suite executes three git commands per variant. A
    // scaffolder that cannot be asked to leave version control alone cannot be tested without it.
    .option('--no-git', 'Do not run git init/add/commit in the new project')
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
            console.error(
                chalk.red('Error:'),
                error instanceof Error ? error.message : String(error)
            );
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
    /**
     * `false` only when `--no-git` was passed; commander leaves a declared `--no-x` at `true`
     * otherwise. Undefined never happens, and the call site tests `!== false` so that a future
     * spelling that does leave it undefined still runs git rather than silently skipping it.
     */
    git?: boolean;
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
            },
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
            initial: true,
        });
    }

    if (options.eslint === undefined) {
        prompts_list.push({
            type: 'confirm',
            name: 'eslint',
            message: 'Would you like to use ESLint?',
            initial: true,
        });
    }

    if (options.tailwind === undefined) {
        prompts_list.push({
            type: 'confirm',
            name: 'tailwind',
            message: 'Would you like to use Tailwind CSS?',
            initial: false,
        });
    }

    if (options.srcDir === undefined) {
        prompts_list.push({
            type: 'confirm',
            name: 'srcDir',
            message: 'Would you like to use `src/` directory?',
            initial: false,
        });
    }

    if (options.ssr === undefined) {
        prompts_list.push({
            type: 'confirm',
            name: 'ssr',
            message: 'Would you like server-side rendering (SSR)?',
            initial: false,
        });
    }

    if (options.app === undefined) {
        prompts_list.push({
            type: 'confirm',
            name: 'app',
            message: 'Would you like to use App Router?',
            initial: true,
        });
    }

    if (options.importAlias === undefined) {
        prompts_list.push({
            type: 'text',
            name: 'importAlias',
            message: 'Would you like to customize the default import alias?',
            initial: '@/*',
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

    // Init git
    // Commander gives `--no-git` the value `git: false`; absent, it is `true`.
    if (options.git !== false) await initGit(projectPath);

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

async function createPackageJson(
    projectPath: string,
    projectName: string,
    useTypeScript: boolean,
    options: CreateOptions
) {
    if (options.ssr) {
        // `options` IS FORWARDED, and it used not to be. `--tailwind` and `--eslint` are handled
        // OUTSIDE the ssr branch (see `setupTailwind` / `setupEslint` at the call site), so
        // `--ssr --tailwind` wrote a `postcss.config.js` that requires `tailwindcss` into a
        // project whose manifest declared neither it nor `autoprefixer` nor `postcss`, and
        // `--ssr --eslint` wrote an `.eslintrc.json` with no `eslint` to read it. Both failed at
        // the user's first `npm run build`, on a scaffold that had otherwise produced every file
        // it promised.
        return createSsrPackageJson(projectPath, projectName, options);
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
            ...(options.eslint ? { lint: 'eslint . --ext ts,tsx,js,jsx --fix' } : {}),
        },
        dependencies: {
            '@exodra/core': '^0.3.0',
            '@exodra/jsx': '^0.3.0',
            '@exodra/dom': '^0.3.0',
            ...(options.app ? { '@exodra/router': '^0.3.0' } : {}),
        },
        devDependencies: {
            vite: '^5.0.0',
            '@exodra/vite-plugin': '^0.3.0',
            ...(useTypeScript
                ? {
                      typescript: '^5.3.3',
                      '@types/node': '^20.0.0',
                  }
                : {}),
            ...(options.tailwind
                ? {
                      tailwindcss: '^3.4.0',
                      autoprefixer: '^10.4.16',
                      postcss: '^8.4.32',
                  }
                : {}),
            ...(options.eslint
                ? {
                      eslint: '^8.56.0',
                      ...(useTypeScript
                          ? {
                                '@typescript-eslint/eslint-plugin': '^6.19.0',
                                '@typescript-eslint/parser': '^6.19.0',
                            }
                          : {}),
                  }
                : {}),
        },
    };

    await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
}

async function createProjectFiles(
    projectPath: string,
    projectName: string,
    useTypeScript: boolean,
    options: CreateOptions
) {
    if (options.ssr) {
        return createSsrFiles(projectPath, projectName);
    }
    const ext = useTypeScript ? 'ts' : 'js';
    const jsxExt = useTypeScript ? 'tsx' : 'jsx';

    // Create src directory
    await fs.ensureDir(path.join(projectPath, 'src'));

    // Create main app file
    const srcPath = options.srcDir ? path.join(projectPath, 'src') : projectPath;
    await fs.ensureDir(srcPath);

    // ONE value for the pages directory: the directory this scaffold WRITES pages
    // into and the one it tells the vite plugin to SCAN. When they drift apart the
    // plugin scans an empty directory, `virtual:exodra-routes` comes back with an
    // empty table, and the generated app mounts with no routes at all — a failure
    // that shows up only at runtime, as a blank outlet.
    //
    // It is `src/` in both states of `--src-dir` because the rest of this scaffold
    // is: `src/main.*`, `src/styles.css`, the `<script src="/src/main.*">` in
    // index.html and tsconfig's `include: ['src']` are all unconditional. Moving
    // pages out of `src/` would put them outside the directory the generated
    // tsconfig typechecks while the application entry stayed inside it.
    const pagesDir = 'src/pages';

    let appContent: string;

    if (options.app) {
        // Create pages directory
        await fs.ensureDir(path.join(projectPath, pagesDir));

        // A page is a machine, default-exported so the generated route table (which wraps
        // every page module in `exoLazy()`) can resolve it. Its markup is an `exoJsx`
        // declaration, which the vite plugin compiles to a schema built once at module load;
        // the machine's `wire` fills its ports.
        const pageModule = (heading: string, paragraph: string) => {
            const typeImports = useTypeScript
                ? `import type { TExoTextPort } from '@exodra/core';\n`
                : '';
            const portsType = useTypeScript ? '<{ heading: TExoTextPort }>' : '';
            return `import { composeExoMachine, createExoMachine, withExoWire } from '@exodra/core';
${typeImports}import { exoJsx } from '@exodra/jsx';

// A page takes no props: the match that selected it arrives as the params of its wire —
// \`withExoWire(m, (c, match) => …)\` — and \`match.params\` and \`match.pathname\` are what it needs.
const pageSchema = exoJsx${portsType}(($) => (
  <div class="container">
    <h1>{$.heading}</h1>
    <p>${paragraph}</p>
  </div>
));
const PagePorts = pageSchema.ports;

const pageBase = createExoMachine(pageSchema);
export default composeExoMachine(pageBase, m =>
  withExoWire(m, c => {
    c.text(PagePorts.heading, '${heading}');
  })
);
`;
        };

        // Home page (index.tsx for file-based routing)
        const homeContent = pageModule(
            `Welcome to ${projectName}`,
            'Your Exodra app with routing is ready!'
        );
        await fs.writeFile(path.join(projectPath, pagesDir, `index.${jsxExt}`), homeContent);

        // About page
        const aboutContent = pageModule('About', 'This is the about page.');
        await fs.writeFile(path.join(projectPath, pagesDir, `about.${jsxExt}`), aboutContent);

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

        // THE ROUTER GETS ITS OWN MODULE, and the reason is a cycle: the route table imports
        // every page, so a page that read the router out of `main` would import the module
        // that renders the app, which imports the table, which imports the page. One module
        // that constructs it and nothing else leaves `import { router } from '../router'`
        // safe from anywhere.
        const routerModule = `import { createExoBrowserHistory, createExoRouter } from '@exodra/router';
import { routes } from 'virtual:exodra-routes';

export const router = createExoRouter(routes, { history: createExoBrowserHistory() });
`;
        await fs.writeFile(path.join(projectPath, `src/router.${ext}`), routerModule);

        const appPortsType = useTypeScript
            ? '<{ nav: TExoChildrenPort; body: TExoChildrenPort }>'
            : '';
        // `TExoDomNode` because `childList` hands out element positions, which `@exodra/core`
        // has no word for; this is the browser entry point, DOM-bound anyway.
        const appInitialStateArg = useTypeScript ? '(c: TExoDomNode)' : 'c';
        const root = useTypeScript
            ? "document.getElementById('app') as HTMLElement"
            : "document.getElementById('app')";
        appContent = `import { createExoMachine } from '@exodra/core';
${
    useTypeScript ? "import type { TExoChildrenPort } from '@exodra/core';\n" : ''
}import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
${
    useTypeScript ? "import type { TExoDomNode } from '@exodra/dom';\n" : ''
}import { exoJsx } from '@exodra/jsx';
import { ExoLink, ExoOutlet, provideExoRouter } from '@exodra/router';
import { router } from './router';
${options.tailwind ? "import './styles.css';\n" : ''}
// THE BACKEND IS BUILT ONCE, HERE, AND THAT IS NOT A STYLE CHOICE. A backend is the
// key a compiled schema is cached under, and it is compared by POINTER — so a backend
// constructed inside a component, a route handler or a render loop is a new key every
// time, and every schema is recompiled (markup parse included) on every render. At
// module scope the compile happens once for the life of the page.
const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

const appSchema = exoJsx${appPortsType}(($) => (
  <div class="app">
    <nav><$.nav /></nav>
    <main><$.body /></main>
  </div>
));
const AppPorts = appSchema.ports;

const App = createExoMachine(appSchema, {
  createInitialState: ${appInitialStateArg} => {
    provideExoRouter(c, router);
    // A real \`<a href>\` each; a plain left click navigates, every other click is the browser's.
    const links = c.childList(AppPorts.nav);
    links.insert(c.build(ExoLink, { to: '/', label: 'Home', currentWhen: 'exact' }));
    links.insert(c.build(ExoLink, { to: '/about', label: 'About', currentWhen: 'exact' }));
    // The route boundary: the page the URL matches stands inside it.
    c.one(AppPorts.body, ExoOutlet);
  },
});

EXO_BACKEND.render(App, ${root});
`;
    } else {
        // No router: one component, rendered once. Same shape as a page — the schema is
        // declared with `exoJsx` and built when the module loads, `wire` fills its ports.
        const soloPortsType = useTypeScript ? '<{ heading: TExoTextPort }>' : '';
        const soloRoot = useTypeScript
            ? "document.getElementById('app') as HTMLElement"
            : "document.getElementById('app')";
        const soloRootClass = options.tailwind ? 'min-h-screen bg-gray-50 py-12 px-4' : 'app';
        const soloHeadingClass = options.tailwind
            ? ' class="text-4xl font-bold text-center mb-4"'
            : '';
        const soloCopyClass = options.tailwind ? ' class="text-lg text-center text-gray-600"' : '';
        appContent = `import { composeExoMachine, createExoMachine, withExoWire } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { exoJsx } from '@exodra/jsx';

${useTypeScript ? "import type { TExoTextPort } from '@exodra/core';\n" : ''}${
            options.tailwind ? "import './styles.css';\n" : ''
        }
// THE BACKEND IS BUILT ONCE, HERE, AND THAT IS NOT A STYLE CHOICE. A backend is the
// key a compiled schema is cached under, and it is compared by POINTER — so a backend
// constructed inside a component, a route handler or a render loop is a new key every
// time, and every schema is recompiled (markup parse included) on every render. At
// module scope the compile happens once for the life of the page.
const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

const appSchema = exoJsx${soloPortsType}(($) => (
  <div class="${soloRootClass}">
    <h1${soloHeadingClass}>{$.heading}</h1>
    <p${soloCopyClass}>Your Exodra app is ready!</p>
  </div>
));
const AppPorts = appSchema.ports;

const appBase = createExoMachine(appSchema);
const App = composeExoMachine(appBase, m =>
  withExoWire(m, c => {
    c.text(AppPorts.heading, 'Welcome to ${projectName}');
  })
);

EXO_BACKEND.render(App, ${soloRoot});
`;
    }

    // `main` keeps the .tsx/.jsx extension so its `exoJsx` declarations, and the pages
    // beside it, are picked up by the same compile rule in vite.config.js.
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

    // The Exodra vite plugin IS the compiler here: it runs `babel-preset-exodra`
    // over every .tsx/.jsx ahead of vite's own esbuild (`enforce: 'pre'`), which is
    // why no second JSX plugin is configured. It also generates the route table
    // `virtual:exodra-routes` from `pagesDir`.
    const viteConfig = `import { defineConfig } from 'vite';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
  plugins: [
    exodra({
      pagesDir: '${pagesDir}',
      apiDir: '${options.srcDir ? 'src/api' : 'api'}'
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
                jsx: 'react-jsx',
                jsxImportSource: '@exodra/jsx/schema',
                strict: true,
                noUnusedLocals: true,
                noUnusedParameters: true,
                noFallthroughCasesInSwitch: true,
                ...(options.importAlias
                    ? {
                          paths: {
                              [options.importAlias.replace('/*', '/*')]: ['./src/*'],
                          },
                      }
                    : {}),
            },
            include: ['src', 'vite-env.d.ts'],
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

async function createSsrPackageJson(
    projectPath: string,
    projectName: string,
    options: CreateOptions
) {
    const packageJson = {
        name: projectName,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
            dev: 'tsx server/dev-server.ts',
            build: 'tsc --noEmit && vite build --outDir dist/client && vite build --ssr src/entry-server.ts --outDir dist/server',
            serve: 'NODE_ENV=production tsx server/prod-server.ts',
            typecheck: 'tsc --noEmit',
        },
        dependencies: {
            '@exodra/context': '^0.3.0',
            '@exodra/core': '^0.3.0',
            '@exodra/dom': '^0.3.0',
            '@exodra/ssr': '^0.3.1',
            '@exodra/string': '^0.4.1',
        },
        devDependencies: {
            '@types/express': '^5.0.0',
            '@types/node': '^20.0.0',
            express: '^5.0.0',
            tsx: '^4.19.0',
            typescript: '^5.3.3',
            vite: '^5.4.0',
            // THE TWO OPTIONAL TOOLCHAINS, declared only when their config files are written.
            // `setupTailwind` and `setupEslint` run for BOTH scaffolds, so this branch has to
            // declare what they leave behind — the same conditional spreads the SPA manifest
            // has carried all along. The versions are that manifest's, deliberately: two
            // scaffolds asking for two different tailwinds is the next bug in this shape.
            ...(options.tailwind
                ? {
                      tailwindcss: '^3.4.0',
                      autoprefixer: '^10.4.16',
                      postcss: '^8.4.32',
                  }
                : {}),
            ...(options.eslint
                ? {
                      eslint: '^8.56.0',
                      '@typescript-eslint/eslint-plugin': '^6.19.0',
                      '@typescript-eslint/parser': '^6.19.0',
                  }
                : {}),
        },
    };
    await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
}

// Scaffold a server-side-rendered app on the schema core. ONE machine is shared by both
// halves: `@exodra/ssr`'s `renderExoPage` turns it into HTML plus a state script on the
// server, and `@exodra/dom` HYDRATES those exact nodes on the client — the server's elements
// are adopted by identity, not rebuilt, so only the listeners are added. The component is
// plain TypeScript (a cursor walk, no JSX), so the same module runs under tsx on the server
// and vite in the browser with no transform.
async function createSsrFiles(projectPath: string, projectName: string) {
    await fs.ensureDir(path.join(projectPath, 'src'));
    await fs.ensureDir(path.join(projectPath, 'server'));

    await fs.writeFile(
        path.join(projectPath, 'src/app.ts'),
        `import {
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode, TExoMachineNodeOf } from '@exodra/core';
import { EXO_SSR_RESPONSE } from '@exodra/ssr';

// What the page starts from. The server hands it to \`renderExoPage\` as params; the client
// reads the same value back out of the state script and hands it to \`hydrate\`.
export type TAppParams = { readonly count: number };

type TAppState = { count: number };

// The CURSOR runs once, when this module loads, and declares the shape plus the
// ports the machine fills.
const AppPorts = exoPorts({ clicks: EXO_PORT_TEXT, bump: EXO_PORT_EVENT });

const appSchema = createExoSchema(AppPorts, b => {
    b.el('div', { class: 'app' }, d => {
        d.el('h1', null, h => h.text('Welcome to ${projectName}'));
        d.el('p', null, p =>
            p.text('Server-rendered with @exodra/ssr, hydrated on the client.')
        );
        d.el('button', { type: 'button' }, btn => {
            btn.eventPort(AppPorts.bump, 'click');
            btn.textPort(AppPorts.clicks);
        });
    });
});
// ONE VALUE, TWO BACKENDS — and this is the scaffold where that has to be literally
// true: \`entry-server\` hands this very machine to \`renderExoPage\` and \`entry-client\`
// hands it to \`withExoHydration(withExoCompiler(new ExoDomBackend())).hydrate(App, root)\`.
// A machine's exonode parameter is contravariant, so built against \`TExoDomNode\`
// this could not have been passed to the server's renderer at all.
const appBase = createExoMachine(appSchema, {
    createInitialState: (_c: TExoMachineNode, _params: TAppParams): TAppState => ({ count: 0 }),
});

function showCount(c: TExoMachineNodeOf<typeof appBase>): void {
    c.text(AppPorts.clicks, 'Clicked ' + c.state.count + ' times');
}

export const App = composeExoMachine(
    appBase,
    m =>
        withExoWire(m, (c, params) => {
            c.state.count = params.count;
            // On the server this writes the state script; in the browser there is no request to talk to.
            c.inject(EXO_SSR_RESPONSE)?.setState('count', params.count);
            showCount(c);
        }),
    m =>
        withExoHandlers(m, on => {
            on(AppPorts.bump, c => {
                c.state.count += 1;
                showCount(c);
            });
        })
);
`
    );

    await fs.writeFile(
        path.join(projectPath, 'src/entry-server.ts'),
        `import { renderExoPage } from '@exodra/ssr';
import { ExoStrBackend } from '@exodra/string';
import { App } from './app';

// ONE BACKEND, BUILT ONCE AT MODULE SCOPE. A backend is the key a compiled schema is
// cached under and it is compared by POINTER, so a backend constructed per request is
// a new key every request — every schema recompiled, markup parse included, on every
// response. Built here, that compile happens once for the life of the process.
const EXO_STR = new ExoStrBackend();

// One instance of the machine, rendered to HTML, plus the state script the client reads
// back. \`appHtml\` goes INSIDE the container \`hydrate\` is handed; \`stateScript\` goes after it.
export function render() {
    const page = renderExoPage(App, { backend: EXO_STR, params: { count: 0 } });
    return { status: page.status, appHtml: page.html, stateScript: page.stateScript };
}
`
    );

    await fs.writeFile(
        path.join(projectPath, 'src/entry-client.ts'),
        `import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
import { readExoStateScript } from '@exodra/ssr';
import { App } from './app';

// HYDRATION IS A PACK, NOT AN ENTRY POINT. \`backend.hydrate\` exists only on a backend
// composed with \`withExoHydration()\`, and the type says so: the pack's result type is
// its argument's plus \`hydrate\`, so calling \`hydrate\` on an uncomposed backend is a
// compile error rather than a call landing on \`undefined\`. It is
// a pack because a value import of the hydration path from a module every client render
// reaches would weld the walk, the adopters and the shape checks into every client-only
// bundle; composed, only the pages that name it pay for it.
//
// ONE BACKEND, AT MODULE SCOPE. A backend is the schema cache key and is compared by
// POINTER, so one built per call recompiles every schema — markup parse included — every
// time. Use this same object for any client-side \`render\` too.
const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));

// What the server transferred: the same params it rendered with, so the first wire on the
// client writes what the server printed and adoption touches nothing.
const state = readExoStateScript();
const count = typeof state?.count === 'number' ? state.count : 0;

// HYDRATE, do not re-render: the server's own elements are claimed by identity and
// only the listeners are attached on top of them. The element handed over is the
// CONTAINER — the instance the server rendered is its first element child.
const root = document.getElementById('root');
if (root) {
    EXO_BACKEND.hydrate(App, root, { count });
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
  <div id="root"><!--app-html--></div>
  <!--app-state-->
  <script type="module" src="/src/entry-client.ts"></script>
</body>
</html>
`
    );

    await fs.writeFile(
        path.join(projectPath, 'vite.config.ts'),
        `import { defineConfig } from 'vite';

// The component in src/app.ts is a cursor walk, not JSX, so there is nothing to
// compile and no JSX plugin to configure. Add \`@exodra/vite-plugin\` here if you
// later want to declare schemas with \`exoJsx\`.
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
                render: () => { status: number; appHtml: string; stateScript: string };
            };
            const { status, appHtml, stateScript } = render();
            const html = template
                .replace('<!--app-html-->', appHtml)
                .replace('<!--app-state-->', stateScript);
            res.status(status).set({ 'Content-Type': 'text/html' }).end(html);
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

    // THE FILE THE `serve` SCRIPT HAS ALWAYS NAMED AND NOTHING HAS EVER WRITTEN.
    //
    // `createSsrPackageJson` declares `"serve": "NODE_ENV=production tsx server/prod-server.ts"`,
    // and until now the only thing this function put in `server/` was `dev-server.ts` — so the
    // scaffold's own script ended in `ENOENT` on a project that had otherwise built cleanly.
    // Nothing could see it: the scaffold test asserted which files exist, and never that the
    // scripts name files that exist.
    //
    // It is the dev server with the two Vite pieces taken out, and it consumes exactly what the
    // `build` script produces: `vite build --outDir dist/client` writes the static assets and
    // the shell, `vite build --ssr src/entry-server.ts --outDir dist/server` writes the renderer.
    await fs.writeFile(
        path.join(projectPath, 'server/prod-server.ts'),
        `import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

// NO BACKEND IS CONSTRUCTED HERE, and that is the point. The renderer lives in
// \`src/entry-server.ts\`, which builds its \`ExoStrBackend\` once at ITS module scope; this
// file imports the built form of that module and calls \`render()\`. A second backend here
// would be a second schema cache key — the same schemas compiled twice — for a function this
// file does not call.
//
// The BUILT output, not the source: \`npm run build\` writes both halves before this runs.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.resolve(projectRoot, 'dist/client');
const PORT = Number(process.env.PORT ?? 3000);

async function main() {
    const template = fs.readFileSync(path.resolve(clientDir, 'index.html'), 'utf-8');
    const { render } = (await import(
        path.resolve(projectRoot, 'dist/server/entry-server.js')
    )) as { render: () => { status: number; appHtml: string; stateScript: string } };

    const app = express();
    // \`index: false\` so the static handler does not answer "/" with the un-rendered shell —
    // every document response has to go through the renderer below.
    app.use(express.static(clientDir, { index: false }));

    app.use(/.*/, (_req, res) => {
        try {
            const { status, appHtml, stateScript } = render();
            res.status(status)
                .set({ 'Content-Type': 'text/html' })
                .end(
                    template
                        .replace('<!--app-html-->', appHtml)
                        .replace('<!--app-state-->', stateScript)
                );
        } catch (err) {
            res.status(500).end((err as Error).message);
        }
    });

    app.listen(PORT, () => console.log(\`prod server: http://localhost:\${PORT}\`));
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
                    // `preserve`: if you add JSX views later, `@exodra/vite-plugin` compiles
                    // them — TypeScript must not lower them into a foreign runtime first.
                    jsx: 'preserve',
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
            es2020: true,
        },
        extends: [
            'eslint:recommended',
            ...(useTypeScript ? ['plugin:@typescript-eslint/recommended'] : []),
        ],
        ...(useTypeScript
            ? {
                  parser: '@typescript-eslint/parser',
                  plugins: ['@typescript-eslint'],
              }
            : {}),
        parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'warn',
        },
    };

    await fs.writeJSON(path.join(projectPath, '.eslintrc.json'), eslintConfig, { spaces: 2 });
}

async function initGit(projectPath: string) {
    const { execSync } = await import('child_process');
    try {
        execSync('git init', { cwd: projectPath, stdio: 'ignore' });
        execSync('git add -A', { cwd: projectPath, stdio: 'ignore' });
        execSync('git commit -m "Initial commit from create-exodra"', {
            cwd: projectPath,
            stdio: 'ignore',
        });
    } catch (e) {
        // Git init failed, ignore
    }
}
