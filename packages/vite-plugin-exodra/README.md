# @exodra/vite-plugin

Vite plugin for Exodra applications with file-based routing and HMR.

## Installation

```bash
npm install --save-dev @exodra/vite-plugin
```

## Overview

This plugin provides:

- **File-based Routing** - Automatic route generation from pages/
- **Hot Module Replacement** - Fast refresh during development
- **JSX Configuration** - Automatic JSX setup
- **API Routes** - File-based API endpoints
- **SSR Support** - Server-side rendering integration

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
  plugins: [
    exodra({
      pagesDir: 'src/pages',  // Default: src/pages
      apiDir: 'src/api',      // Default: src/api
      ssr: false,             // Default: false
      alias: '@'              // Default: @
    })
  ]
});
```

## File-based Routing

The plugin automatically generates routes from your file structure:

```
src/pages/
├── index.tsx             → /
├── about.tsx             → /about
├── _layout.tsx           → Layout wrapper
├── _error.tsx            → Error boundary
├── blog/
│   ├── index.tsx         → /blog
│   ├── [id].tsx          → /blog/:id
│   ├── [...slug].tsx     → /blog/* (catch-all)
│   └── _layout.tsx       → Blog layout
├── shop/
│   ├── [[...path]].tsx   → /shop (optional catch-all)
│   └── checkout.tsx      → /shop/checkout
└── admin/
    ├── _layout.tsx       → Admin layout
    └── dashboard.tsx     → /admin/dashboard
```

### Special Files

- `_layout.tsx` - Wraps all pages in the directory
- `_error.tsx` - Error boundary for the directory
- `index.tsx` - Default route for directory

### Dynamic Routes

- `[param].tsx` - Single dynamic segment
- `[...params].tsx` - Catch-all route (required)
- `[[...params]].tsx` - Optional catch-all route

## Using Generated Routes

```tsx
// main.tsx
import { mount } from '@exodra/dom';
import {
  createRouter,
  createBrowserHistory,
  RouterProvider,
  Outlet,
} from '@exodra/router';

// Import auto-generated routes
import { routes } from 'virtual:exodra-routes';

const router = createRouter(routes, { history: createBrowserHistory() });

mount(
  <RouterProvider static={{ router }}>
    <Outlet />
  </RouterProvider>,
  document.getElementById('app')!
);
```

## Layout Files

Create `_layout.tsx` to wrap pages:

JSX props go in typed buckets — static attributes (including `class` and
`children`) in `static`, never as flat React-style attributes.

```tsx
// pages/_layout.tsx
import { Link, Outlet } from '@exodra/router';

export default function RootLayout() {
  return (
    <div static={{ class: 'app' }}>
      <header>
        <nav>
          <Link static={{ to: '/', children: 'Home' }} />
          <Link static={{ to: '/about', children: 'About' }} />
          <Link static={{ to: '/blog', children: 'Blog' }} />
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer static={{ children: '© 2024' }} />
    </div>
  );
}
```

## Error Boundaries

Handle errors with `_error.tsx`:

```tsx
// pages/_error.tsx
import { Link } from '@exodra/router';

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div static={{ class: 'error' }}>
      <h1 static={{ children: 'Error' }} />
      <p static={{ children: error.message }} />
      <Link static={{ to: '/', children: 'Go Home' }} />
    </div>
  );
}
```

## API Routes

Create API endpoints in the `api/` directory:

```typescript
// src/api/users.ts
export async function GET(request: Request) {
  const users = await fetchUsers();
  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request) {
  const data = await request.json();
  const user = await createUser(data);
  return new Response(JSON.stringify(user), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

Access at `/api/users` with appropriate HTTP methods.

## Hot Module Replacement

The plugin provides HMR for Exodra components:

```tsx
// Automatically added to components
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // Component updates without losing state
  });
}
```

## TypeScript Support

Add type definitions for virtual modules:

```typescript
// env.d.ts
/// <reference types="vite/client" />

declare module 'virtual:exodra-routes' {
  import type { TExoRoute } from '@exodra/router';
  export const routes: TExoRoute[];
}
```

## SSR Configuration

Enable SSR support:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    exodra({
      ssr: true
    })
  ],
  ssr: {
    noExternal: ['@exodra/core', '@exodra/ssr']
  }
});
```

## Development Server

```bash
# Start dev server
npm run dev

# Routes are available at:
# http://localhost:5173/
# http://localhost:5173/about
# http://localhost:5173/blog/my-post
# etc.
```

## Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Advanced Configuration

### Custom Pages Directory

```typescript
exodra({
  pagesDir: 'src/routes',
})
```

## Troubleshooting

### Routes Not Updating

- Restart the dev server after adding new route files
- Check that files have `.tsx` or `.jsx` extension
- Verify file names follow conventions

### HMR Not Working

- Ensure components are default exports
- Check that Vite HMR is enabled
- Verify no syntax errors in components

### TypeScript Errors

- Add `env.d.ts` with virtual module declarations
- Update `tsconfig.json` to include type files

## API Reference

### Plugin Options

- `pagesDir` - Directory for page components (default: `'src/pages'`)
- `apiDir` - Directory for API routes (default: `'src/api'`)
- `ssr` - Enable SSR support (default: `false`)
- `alias` - Import alias (default: `'@'`)

### Virtual Modules

- `virtual:exodra-routes` - Generated routes array

### Events

The plugin sends custom HMR events:

- `exodra:component-update` - Component updated
- `exodra:route-update` - Routes changed

## License

MIT
---

📖 Full documentation: **[exodra.org](https://exodra.org)**
