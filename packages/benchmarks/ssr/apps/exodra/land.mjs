import { h } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
const L='Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation';
export function makeApp(){
  const kids=[];
  for(let i=0;i<50;i++) kids.push(h('section',{static:{class:'sec',children:[h('h2',{static:{children:'Section '+i}}),h('p',{static:{children:L+' '+i}})]}}));
  for(let j=0;j<3;j++){const slide=bindable(0);kids.push(h('div',{static:{class:'carousel','data-id':String(j),children:[h('span',{static:{class:'car__label',children:'Carousel '+j+' slide '}}),h('button',{static:{class:'car__next','data-b':String(j)},bindables:{textContent:slide},handlers:{onClick:()=>slide.setValue(slide.getValue()+1)}})]}}));}
  return h('div',{static:{class:'landing',children:kids}});
}
