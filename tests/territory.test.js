import test from 'node:test';
import assert from 'node:assert/strict';
import {territoryShares,territoryPixels} from '../public/src/territory.js';
test('unclaimed map stays empty; rounding always preserves full occupied area',()=>{
  assert.deepEqual(territoryShares({}),{shu:0,wei:0,wu:0,qun:0});
  for(let n=1;n<100;n++){const s=territoryShares({shu:{contribution:n},wei:{contribution:3},wu:{contribution:7},qun:{contribution:0}});assert.equal(Object.values(s).reduce((a,b)=>a+b),10000);assert.equal(s.qun,0);}
});
test('map territory matches quotas and leaves transparent pixels unoccupied',()=>{
  const alpha=new Uint8Array(120).fill(255);alpha.fill(0,0,20);
  const shares={shu:5000,wei:3000,wu:1500,qun:500},a=territoryPixels(alpha,12,10,shares),b=territoryPixels(alpha,12,10,shares);
  assert.deepEqual(a.owners,b.owners);assert.deepEqual(a.counts,{shu:50,wei:30,wu:15,qun:5});
  for(let f=0;f<4;f++)assert.equal([...a.owners].filter(o=>o===f).length,[50,30,15,5][f]);
  assert.ok([...a.owners.slice(0,20)].every(o=>o===-1));
  assert.ok([...territoryPixels(alpha,12,10,{shu:0,wei:0,wu:0,qun:0}).owners].every(o=>o===-1));
});
