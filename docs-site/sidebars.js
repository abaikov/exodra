// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.

 @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  tutorialSidebar: [
    'getting-started',
    'benchmarks',
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'core/concepts',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/jsx',
        'guides/components',
        'guides/lists',
        'guides/ssr',
        'guides/react',
        'guides/ai-development',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/core',
        'api/reactivity',
        'api/dom',
        'api/router',
        'api/string',
        'api/forms',
      ],
    },
    {
      type: 'category',
      label: 'Tooling',
      items: [
        'tooling/create-exodra',
        'tooling/vite-plugin',
        'tooling/babel-plugin',
        'tooling/introspect',
        'tooling/profiler',
      ],
    },
  ],
};

export default sidebars;
