import { h } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
const TAGS = ['ui','api','bug','perf','docs'];
const AUTHORS = ['Ada','Lin','Rex','Mia','Sol'];
export function makeApp(n = globalThis.__N__ ?? 200) {
  const cards = new Array(n);
  for (let i = 0; i < n; i++) {
    const count = bindable(0);
    const tags = [0,1,2].map(k => h('span',{static:{class:'tag',children:TAGS[(i+k)%TAGS.length]}}));
    const comments = [0,1,2].map(k => h('li',{static:{class:'cmt',children:[
      h('b',{static:{class:'author',children:AUTHORS[(i+k)%AUTHORS.length]}}),
      h('span',{static:{class:'body',children:'note '+k+' on task '+i}})]}}));
    cards[i] = h('article',{static:{class:'card','data-id':String(i),children:[
      h('h3',{static:{class:'card__title',children:'Task '+i}}),
      h('div',{static:{class:'card__tags',children:tags}}),
      h('button',{static:{class:'card__btn','data-b':String(i)},bindables:{textContent:count},handlers:{onClick:()=>count.setValue(count.getValue()+1)}}),
      h('ul',{static:{class:'card__comments',children:comments}})]}});
  }
  return h('div',{static:{class:'todo',children:cards}});
}
