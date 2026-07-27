import { qwikVite } from '@builder.io/qwik/optimizer';
import { writeFileSync } from 'fs'; import { resolve } from 'path';
const M=resolve(process.cwd(),'ssr/dist/qwik-todo/manifest.json');
export default { build:{minify:true}, plugins:[qwikVite({ srcDir:'ssr/apps/qwik', client:{ input:'ssr/apps/qwik/todo.jsx', outDir:'ssr/dist/qwik-todo', emptyOutDir:false, manifestOutput:(m)=>writeFileSync(M,JSON.stringify(m)) } })] };
