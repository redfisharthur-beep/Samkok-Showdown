const FILES={home:'bgm-home.mp3',battle:'bgm-battle.mp3',hit:'sfx-hit.mp3',death:'sfx-death.mp3',victory:'sfx-victory.mp3',defeat:'sfx-defeat.mp3'};
export function createGameAudio(makeAudio=src=>new Audio(src),clock=()=>performance.now()){
 const tracks=new Map(),voices=new Map(),missing=new Set(),active=new Set(),last=new Map();let unlocked=false,hidden=false,scene='home',music=null,previous=null;
 function track(key){if(!tracks.has(key)){const a=makeAudio('/assets/audio/'+FILES[key]);a.preload='none';a.addEventListener('error',()=>missing.add(key));tracks.set(key,a);}return tracks.get(key);}
 function play(a,key){if(missing.has(key))return;try{const pending=a.play();pending?.catch(()=>{});}catch{}}
 function stopEffects(){for(const a of active){a.pause();a.currentTime=0;}active.clear();}
 function syncMusic(){const key=scene==='battle'?'battle':'home';if(!music){music=makeAudio('/assets/audio/'+FILES[key]);music.preload='auto';}const src='/assets/audio/'+FILES[key];if(!music.src.endsWith(src)){music.pause();music.src=src;music.load();}music.loop=true;music.volume=scene==='result'?.15:.3;if(unlocked&&!hidden)play(music,key);else music.pause();}
 function effect(key,heavy=false){
  if(!unlocked||hidden||missing.has(key)||active.size>=4)return;const now=clock();if(now-(last.get(key)??-Infinity)<(key==='hit'?120:key==='death'?250:1000))return;
  last.set(key,now);if(!voices.has(key))voices.set(key,[]);const pool=voices.get(key);let a=pool.find(voice=>!active.has(voice));
  if(!a){if(pool.length>=4)return;a=track(key).cloneNode();a.addEventListener('ended',()=>active.delete(a));a.addEventListener('error',()=>{missing.add(key);active.delete(a);});pool.push(a);}
  a.currentTime=0;a.volume=key==='hit'?(heavy?.5:.35):.65;active.add(a);try{a.play()?.catch(()=>active.delete(a));}catch{active.delete(a);}
 }

 return {
  unlock(){unlocked=true;if(music?.error)music.load();syncMusic();},
  visibility(value){hidden=value;if(hidden)stopEffects();syncMusic();},
  scene(value){if(scene===value)return;scene=value;stopEffects();syncMusic();},
  begin(battle){previous=new Map([...battle.units,...battle.buildings].map(u=>[u.id,{hp:u.hp,hurtAt:u.hurtAt,building:!!(u.castle||u.tower)}]));last.clear();},
  update(battle){const actors=[...battle.units,...battle.buildings],next=new Map();let hit=false,death=false;for(const u of actors){const old=previous?.get(u.id);if(old){if(u.hurtAt!==undefined&&u.hurtAt!==old.hurtAt)hit=true;if(old.hp>0&&u.hp<=0&&!u.castle&&!u.tower)death=true;}next.set(u.id,{hp:u.hp,hurtAt:u.hurtAt,building:!!(u.castle||u.tower)});}if(previous)for(const [id,old] of previous)if(old.hp>0&&!old.building&&!next.has(id))death=true;previous=next;if(battle.pauseRemaining>0||battle.serverPaused)return;if(hit)effect('hit',battle.effects?.some(e=>e.id==='hit'&&e.heavy));if(death)effect('death');},
  result(winner){this.scene('result');if(winner===0)effect('victory');else if(winner===1)effect('defeat');}
 };
}
