import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as engine from '../public/src/engine.js';
import * as data from '../public/src/data.js';
import * as sync from '../public/src/battle-sync.js';
import {ATTACK_SHEETS,LORD_ATTACK_SHEETS} from '../public/src/phaser-combat-stage.js';
const source=readFileSync(new URL('../public/src/app.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace(/\ninitialize\(\);\s*$/,'');
const clone=value=>JSON.parse(JSON.stringify(value));
function harness(fetch){
 const calls=[];let surfaces=0;
 const context=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>calls.push({method:k,args})),set:(o,k,v)=>(o[k]=v,true)});
 const node={textContent:'',querySelector:()=>null,querySelectorAll:()=>[],getContext:()=>context};
 const document={querySelector:()=>node,addEventListener(){},createElement:()=>{surfaces++;return {...node};}};
 const sandbox={ATTACK_SHEETS,LORD_ATTACK_SHEETS,...engine,...data,...sync,document,localStorage:{getItem:()=>null,setItem(){}},sessionStorage:{removeItem(){}},performance:{now:()=>1000},crypto,fetch,AbortController,structuredClone,Image:class{complete=true;naturalWidth=200;naturalHeight=300;},createGameAudio:()=>({}),matchMedia:()=>({matches:false}),setTimeout,clearTimeout,setInterval,clearInterval,cancelAnimationFrame(){},location:{protocol:'https:',host:'example.com'}};
 vm.createContext(sandbox);vm.runInContext(source+`\nglobalThis.hooks={set(b,o=null){battle=b;online=o;ui={ctx:globalThis.ctx};},deployCard,command,acceptState,draw,drag(value){drag=value;},getBattle:()=>battle};`,sandbox);sandbox.ctx=context;
 return {hooks:sandbox.hooks,calls,surfaces:()=>surfaces};
}
function packet(battle,sequence=0){return {ok:true,side:0,disconnect:[null,null],battle:{...clone(battle),snapshotSequence:sequence}};}
test('returning to the visible upper hand edge cancels before edge snapping; normal release spends once',async()=>{
 const h=harness(),b=new engine.Battle('shu',data.defaultDeck('shu'));h.hooks.set(b);const initial=b.sides[0].morale,queue=[...b.sides[0].queue];assert.equal(await h.hooks.deployCard({index:0,id:'guanyu'},{x:300,y:850}),false);assert.equal(b.sides[0].morale,initial);assert.deepEqual(b.sides[0].queue,queue);
 assert.equal(await h.hooks.deployCard({index:0,id:'guanyu'},{x:149,y:600}),true);assert.equal(b.sides[0].morale,0);assert.equal(b.units.at(-1).assetId,'guanyu');
});
test('queued different cards resolve their new hand index after acknowledgement; movement stays available',async()=>{
 const server=new engine.Battle('shu',data.defaultDeck('shu'));server.sides[0].morale=10;const requests=[];let releaseFirst,seq=0;
 const h=harness(async(url,init)=>{const action=JSON.parse(init.body);requests.push(action);if(action.cardId==='guanyu')await new Promise(resolve=>releaseFirst=resolve);const ok=action.type==='move'?server.moveLord(0,action.x,action.y):server.play(0,action.index,action.x,action.y);assert.equal(ok,true);return {ok:true,json:async()=>packet(server,++seq)};});h.hooks.set(server,{id:'room',side:0});h.hooks.acceptState(packet(server));
 const first=h.hooks.command('play',{index:0,cardId:'guanyu',x:149,y:600});await new Promise(resolve=>setImmediate(resolve));
 const second=h.hooks.command('play',{index:1,cardId:'zhangfei',x:149,y:600});const move=h.hooks.command('move',{x:300,y:600});await move;assert.equal(requests.length,2);releaseFirst();assert.equal(await first,true);assert.equal(await second,true);assert.equal(requests.at(-1).cardId,'zhangfei');assert.equal(requests.at(-1).index,0);assert.equal(server.sides[0].morale,1);
});
test('rendering caches original artwork and deployment ghosts draw no placement circles',()=>{
 const h=harness(),b=new engine.Battle('shu',data.defaultDeck('shu'));h.hooks.set(b);h.hooks.draw();const first=h.surfaces();h.hooks.draw();assert.equal(h.surfaces(),first);
 for(const id of ['spear','guanyu','fireball']){h.calls.length=0;h.hooks.drag({x:149,y:600,index:0,card:data.card(id)});h.hooks.draw();assert.equal(h.calls.some(c=>c.method==='arc'),false);}
});
test('older sequence snapshots cannot restore a cinematic after it resumes',()=>{
 const h=harness(),b=new engine.Battle('shu',data.defaultDeck('shu'));h.hooks.set(b);const resumed=packet(b,3);resumed.battle.pauseRemaining=0;assert.equal(h.hooks.acceptState(resumed),true);const old=packet(b,2);old.battle.pauseRemaining=.7;assert.equal(h.hooks.acceptState(old),false);assert.equal(h.hooks.getBattle().pauseRemaining,0);
});
