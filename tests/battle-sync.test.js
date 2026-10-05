import test from 'node:test';
import assert from 'node:assert/strict';
import {SnapshotBuffer,FixedStepper,dragPoint,cardRelease} from '../public/src/battle-sync.js';
const state=(elapsed,x,hp=100)=>({elapsed,units:[{id:1,x,y:500,hp,maxHp:100}],effects:[{id:'projectile',age:.1,duration:.32}],sides:[],buildings:[]});
test('snapshot positions interpolate without changing authoritative HP and source state',()=>{
 const buffer=new SnapshotBuffer(.1),a=state(1,100),b=state(1.1,110,80);buffer.push(a,1000);buffer.push(b,1100);
 const view=buffer.sample(1150);assert.ok(Math.abs(view.units[0].x-105)<1e-6);assert.equal(view.units[0].hp,100);assert.ok(Math.abs(view.effects[0].age-.15)<1e-6);assert.equal(b.units[0].x,110);
 const impact=buffer.sample(1200);assert.equal(impact.units[0].hp,80);assert.equal(impact.units[0].x,110);assert.equal(buffer.sample(9999).units[0].x,110);
});
test('pause and settlement show immediately; identical elapsed snapshots and missing actors are safe',()=>{
 const buffer=new SnapshotBuffer();buffer.push(state(1,100),1000);const paused={...state(1,110),pauseRemaining:.7};buffer.push(paused,1100);assert.equal(buffer.sample(1100).units[0].x,110);
 buffer.push({...state(1,120),result:{winner:0}},1200);assert.equal(buffer.sample(1200).result.winner,0);
 const empty=new SnapshotBuffer();empty.push({...state(1,100),units:[]},1000);empty.push(state(1.1,110),1100);assert.doesNotThrow(()=>empty.sample(1150));
});
test('fixed simulation runs equal time at 30, 60 and 120 Hz and caps background catchup',()=>{
 for(const hz of [30,60,120]){const timer=new FixedStepper();let elapsed=0;for(let i=0;i<hz*5;i++)timer.advance(1/hz,dt=>elapsed+=dt);assert.ok(Math.abs(elapsed-5)<1e-8);let updates=0;timer.advance(90,()=>updates++);assert.equal(updates,15);}
});
test('touch ghost sits above the finger; returning to the hand cancels before clamping',()=>{
 const p={x:300,y:950};assert.equal(cardRelease(p,903),false);assert.equal(cardRelease({x:300,y:902},903),true);assert.deepEqual(dragPoint({x:300,y:600},'touch',2),{x:300,y:496});assert.deepEqual(dragPoint(p,'mouse',2),p);assert.equal(cardRelease({x:NaN,y:500},903),false);
});
test('cinematic resume replaces frozen-time snapshots instead of replaying the pause',()=>{
 const buffer=new SnapshotBuffer();buffer.push({...state(1,100),pauseRemaining:.7},1000);buffer.push({...state(1,100),pauseRemaining:0},1700);assert.equal(buffer.sample(1700).pauseRemaining,0);
});
