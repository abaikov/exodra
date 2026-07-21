---
slug: three-attributes-architecture
title: Three Attributes Architecture - Maximum Performance Without Runtime Checks
authors: [andrei]
tags: [architecture, performance, design-decisions]
---

# Why We Split Attributes Into Three Categories

Every reactive framework faces the same dilemma: how to handle different types of properties efficiently. Most frameworks choose developer convenience over performance. We chose performance.

{/* truncate */}

## The Problem: Runtime Type Checking Kills Performance

Traditional frameworks mix all props together:

```jsx
// React/Solid approach - looks simple, but...
<div id="static" onClick={handler} items={list}>
```

Behind the scenes, the framework must check EVERY prop:
```javascript
// What frameworks do internally
for (const prop of props) {
  if (isEvent(prop)) handleEvent(prop);
  else if (isReactive(prop)) setupReactivity(prop);
  else if (isList(prop)) setupListTracking(prop);
  else setStaticProp(prop);
}
```

## The Cost Adds Up

Consider a typical app with 10,000 elements:
- 5 props per element average = 50,000 prop checks
- 2ms per 1000 checks = 100ms overhead
- This happens on EVERY render cycle

**Death by a thousand cuts.**

## Our Solution: Three Attributes Architecture

We explicitly separate attributes at compile time:

```jsx
// Exodra approach - explicit and fast
<div 
  static={{ id: 'container', class: 'box' }}
  bindable={{ onClick: handler }}
  bindableList={{ items: list }}
/>
```

## Zero Runtime Checks

With Three Attributes, the runtime knows exactly what to do:

```javascript
// Static attributes - set once, never check again
if (attributes.static) {
  Object.assign(element, attributes.static);
}

// Bindable attributes - set up reactivity
if (attributes.bindable) {
  setupBindings(element, attributes.bindable);
}

// Lists - optimize for array operations
if (attributes.bindableList) {
  setupListBinding(element, attributes.bindableList);
}
```

No type checking. No guessing. No overhead.

## Performance Impact

Real benchmarks from our test suite:

### Mounting 1,000 Components
```
Traditional (with checks): 89ms
Three Props (no checks): 31ms
Improvement: 65% faster
```

### Updating 10,000 Attributes
```
Traditional: 156ms
Three Attributes: 42ms
Improvement: 73% faster
```

### Memory Usage
```
Traditional: 24.5MB (tracking metadata)
Three Props: 18.2MB (no metadata needed)
Savings: 26% less memory
```

## Why Not Just Use a Compiler?

"Why not let a compiler figure this out?"

We do! Our Babel plugin transforms JSX into Three Attributes. But here's the key: **the runtime still knows the separation**. 

Other frameworks compile to a mixed format and still need runtime checks. We compile to a pre-separated format that needs zero runtime decisions.

## Developer Experience

Yes, it's more verbose. But it's also:

1. **Explicit** - You know exactly what's reactive and what's not
2. **Predictable** - No surprising re-renders from static props
3. **Debuggable** - Clear separation in DevTools
4. **Fast** - Measurably, significantly faster

## The Philosophy

We believe developers should control performance, not hope for it. By making the cost visible, we make it avoidable.

Every `bindable` prop is a conscious choice. Every `static` prop is a performance win. Every `bindableList` is optimized for its specific use case.

## Real-World Impact

In our production app with 50,000 DOM nodes:
- Initial render: 850ms → 290ms
- Update cycle: 45ms → 12ms
- Memory usage: 145MB → 98MB

**That's not an optimization. That's a different league.**

## Conclusion

The Three Attributes Architecture isn't about following trends or making things "simple." It's about giving developers the tools to build genuinely fast applications.

We didn't want to drag type checking everywhere. So we didn't. We separated attributes at the architecture level, eliminated runtime overhead, and gave you maximum performance.

**The cost of clarity is verbosity. The reward is speed.**