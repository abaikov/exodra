import { qwikVite } from '@builder.io/qwik/optimizer';
export default { build:{ssr:true,outDir:'ssr/dist/qwik-todo/server',minify:false,rollupOptions:{input:'ssr/apps/qwik/entry.ssr-todo.jsx'}}, plugins:[qwikVite({ srcDir:'ssr/apps/qwik', ssr:{input:'ssr/apps/qwik/entry.ssr-todo.jsx'} })] };
