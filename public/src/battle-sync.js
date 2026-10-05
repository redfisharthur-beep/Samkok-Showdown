// Presentation is delayed one snapshot; game rules always use the newest server state.
export class SnapshotBuffer {
 constructor(delay=.12){this.delay=delay;this.frames=[];}
 push(battle,now){if(this.frames.at(-1)?.battle.elapsed===battle.elapsed)this.frames.pop();this.frames.push({battle:structuredClone(battle),now});this.frames=this.frames.slice(-8);}
 sample(now){
  if(!this.frames.length)return null;
  const newest=this.frames.at(-1);if(newest.battle.serverPaused||newest.battle.pauseRemaining>0||newest.battle.result)return structuredClone(newest.battle);
  const elapsed=Math.max(this.frames[0].battle.elapsed,newest.battle.elapsed+Math.min(.1,Math.max(0,(now-newest.now)/1000))-this.delay);
  let left=this.frames[0],right=left;
  for(const f of this.frames){if(f.battle.elapsed<=elapsed)left=f;if(f.battle.elapsed>=elapsed){right=f;break;}right=f;}
  const view=structuredClone(left.battle),span=right.battle.elapsed-left.battle.elapsed,t=span>0?Math.max(0,Math.min(1,(elapsed-left.battle.elapsed)/span)):0;
  const next=new Map(right.battle.units.map(u=>[u.id,u]));
  for(const u of view.units){const n=next.get(u.id);if(n){u.x+=(n.x-u.x)*t;u.y+=(n.y-u.y)*t;}}
  for(const side of view.sides)if(side.lord)side.lord=view.units.find(u=>u.id===side.lord.id)||side.lord;
  view.elapsed=Math.min(elapsed,newest.battle.elapsed);view.effects=view.effects.map(e=>({...e,age:e.age+Math.max(0,view.elapsed-left.battle.elapsed)})).filter(e=>e.age<e.duration);
  return view;
 }
}
export class FixedStepper {
 constructor(step=1/60){this.step=step;this.remaining=0;}
 advance(seconds,update){this.remaining+=Math.max(0,Math.min(.25,seconds));let count=0;while(this.remaining+1e-9>=this.step&&count<15){update(this.step);this.remaining-=this.step;count++;}return count;}
}
export function dragPoint(point,pointerType,scale=1){return {...point,y:point.y-(pointerType==='touch'?52*scale:0)};}
export function cardRelease(point,panelTop){return Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.y<panelTop;}
