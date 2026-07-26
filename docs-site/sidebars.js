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
        'concept',
        'core/concepts',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/jsx',
        'guides/components',
        'guides/rendering',
        'guides/lists',
        'guides/optimizations',
        'guides/ssr',
        'guides/testing',
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
        'api/attrs',
        'api/style',
      ],
    },
    {
      type: 'category',
      label: 'Tooling',
      items: [
        'tooling/create-exodra',
        'tooling/cdn',
        'tooling/vite-plugin',
        'tooling/babel-plugin',
        'tooling/babel-preset',
        'tooling/bundlers',
        'tooling/swc-plugin',
        'tooling/introspect',
        'tooling/profiler',
      ],
    },
  ],
};

export default sidebars;
