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
    // The benchmarks page read against the requirement rather than for its numbers: which of the
    // 24 axes carries a floor, which shows a strategy beside the default, and — the part it
    // exists for — which ordinary situations (a form, a navigation, a refetched list) nothing in
    // the suite measures. It sits directly under `benchmarks` because it is that page's own
    // coverage report and is unreadable before it.
    'benchmarks-coverage',
    'limits-and-plans',
    // The page a production console sends people to. A build strips the prose out of a
    // refusal and leaves a code like `EXO0001`; this is the only place that code can be
    // looked up, so it sits at the top level rather than under a category nobody opens.
    'errors',
    {
      type: 'category',
      label: 'Why Exodra',
      items: [
        'why/sugar-not-restrictions',
        'why/abstractions-collapse',
        // The plugin-interface argument carried to a case that fails it: the renderer as one more
        // replaceable field, designed far enough to show it buys nothing an entry point does not,
        // and that the typing obstacle everyone stops at was never the reason. It follows the two
        // pages it argues from.
        'why/the-renderer-slot',
        'why/what-the-floor-says',
        // Thirteen reorder algorithms priced against this repository, concluding the incumbent
        // subsequence pass is already optimal on the expensive term. It sits after the floor
        // page because that is where a reader learns costs here are claimed against a measurement.
        'why/order-without-recomputing',
        'why/what-others-forbid',
        'why/imperative-escape',
      ],
    },
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
        'guides/rendering',
        'guides/lists',
        'guides/optimizations',
        // The plugin-interface reference. It sits after `optimizations` because that page is where
        // a reader first meets a replaceable piece as a named thing (the keyed list, the node bank)
        // and has to come here to find out what one is.
        'guides/plugins',
        'guides/ssr',
        'guides/testing',
        'guides/react',
        'guides/react-compat',
        'guides/to-react',
        'guides/ai-development',
      ],
    },
    // ONCE NOT NAVIGABLE, AND IN THE LLM DIGEST THE WHOLE TIME. `security` and
    // `tooling/babel-plugin` were in generate-llms-full.mjs's ORDER and in no sidebar entry,
    // so a model could read them and a person could not reach them. A security page a reader
    // cannot find is the sharpest form of that.
    'security',
    'troubleshooting',
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/core',
        'api/dom',
        'api/router',
        'api/string',
        'api/forms',
        'api/style',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/dependency-graph', 'architecture/package-graph'],
    },
    {
      type: 'category',
      label: 'Tooling',
      items: [
        'tooling/create-exodra',
        'tooling/cdn',
        'tooling/vite-plugin',
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
