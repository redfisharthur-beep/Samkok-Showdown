import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const repo=path.resolve(process.argv[2]||fileURLToPath(new URL('..',import.meta.url))),out=path.resolve(process.argv[3]||'./simulation-results');
const simulationSeed=Number(process.env.SIM_SEED||20261005);
const limit=Number(process.env.SIM_LIMIT||1000),commit=process.env.SIM_COMMIT||null;
const {Battle,walkable,TERRAIN,placementPoint}=await import(pathToFileURL(path.join(repo,'public/src/engine.js')));
const {CARDS,FACTIONS,card,validateDeck}=await import(pathToFileURL(path.join(repo,'public/src/data.js')));
fs.mkdirSync(out,{recursive:true});
const factions=Object.keys(FACTIONS),styles=['rush','defense','siege','spell','balanced'];
const styleNames={rush:'快攻',defense:'防守恢復',siege:'攻城',spell:'法術控制',balanced:'混合'};
const core={rush:['cavalry','scout'],defense:['shield','medic'],siege:['ram','catapult'],spell:['fireball','arrows'],balanced:['archer','spear']};
const favorites={rush:['spear','archer','ambush','inspire','arrows'],defense:['spear','archer','guard','barricade','fireball'],siege:['shield','medic','guard','inspire','fireball'],spell:['lightning','fire','shield','archer','medic'],balanced:['cavalry','shield','medic','fireball','ambush','inspire']};
const rng=seed=>()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
const shuffle=(a,r)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const canonicalY=(y,s)=>s?862-y:y,physicalY=(y,s)=>s?862-y:y;
function makeDeck(f,style,v){
 const r=rng(simulationSeed+factions.indexOf(f)*10000+styles.indexOf(style)*100+v);
 const n=v%5===4?4:v%5===3?3:2;
 const deck=shuffle(CARDS.filter(c=>c.faction===f).map(c=>c.id),r).slice(0,n);
 deck.push(...core[style]);
 while(deck.length<8){
  const options=CARDS.filter(c=>c.faction==='all'&&!deck.includes(c.id)&&(c.type!=='spell'||deck.filter(id=>card(id).type==='spell').length<3));
  const weighted=options.flatMap(c=>Array(favorites[style].includes(c.id)?4:1).fill(c.id));
  deck.push(weighted[Math.floor(r()*weighted.length)]);
 }
 assert.ok(validateDeck(f,deck));return shuffle(deck,r);
}
const decks={};for(const f of factions)for(const style of styles)for(let v=0;v<10;v++)decks[`${f}-${style}-${v}`]={faction:f,style,variant:v,deck:makeDeck(f,style,v)};

// Both sides use this same controller. No engine functions or combat rules are replaced.
// Every action uses Battle's public methods, and both plans read the pre-action state.
function plan(b,s,r,state){
 const p=b.sides[s],lord=p.lord,enemy=b.units.filter(t=>t.hp>0&&t.side!==s),allies=b.units.filter(t=>t.hp>0&&t.side===s),army=allies.filter(t=>!t.lord);
 const bases=b.buildings.filter(t=>t.hp>0&&t.side===s),foeBases=b.buildings.filter(t=>t.hp>0&&t.side!==s);
 const intruders=enemy.filter(t=>canonicalY(t.y,s)>=490),danger=intruders.slice().sort((a,b)=>Math.min(...bases.map(t=>d(a,t)))-Math.min(...bases.map(t=>d(b,t))))[0];
 const near=enemy.filter(t=>d(t,lord)<180),ratio=lord.hp/lord.maxHp;
 let move=null;
 if(lord.hp>0){
  if(ratio<.3)move={x:300,y:physicalY(746,s)};
  else if(danger)move={x:danger.x,y:physicalY(clamp(canonicalY(danger.y,s)+Math.min(lord.range*.6,90),500,730),s)};
  else{const front=army.slice().sort((a,b)=>canonicalY(a.y,s)-canonicalY(b.y,s))[0];move={x:front?.x||300,y:physicalY(army.length>=3?540:610,s)};}
 }
 const ultimate=p.charge>=100&&!p.used&&lord.hp>0&&(ratio<.38||p.faction==='shu'&&allies.filter(t=>t.hp/t.maxHp<.75).length>=2||p.faction==='wei'&&near.length>=2||p.faction==='wu'&&army.length>=3||p.faction==='qun'&&near.length>0||b.elapsed>155&&near.length>0);
 const weak=foeBases.filter(t=>t.tower).sort((a,b)=>a.hp-b.hp)[0]||foeBases[0];
 let lane;
 if(danger)lane=TERRAIN.bridges.slice().sort((a,b)=>Math.abs(a-danger.x)-Math.abs(b-danger.x))[0];
 else{const scores=TERRAIN.bridges.map(x=>({x,n:enemy.filter(t=>Math.abs(t.x-x)<120).reduce((n,t)=>n+t.hp/800,0)-army.filter(t=>Math.abs(t.x-x)<120).length*.45+(weak?Math.abs(x-weak.x)/350:0)+r()*.9}));lane=scores.sort((a,b)=>a.n-b.n)[0].x;}
 const options=[];
 for(const [index,c] of b.hand(s).entries()){
  let x=lane,y=physicalY(danger?clamp(canonicalY(danger.y,s)+65,512,722):520+r()*24,s),score=0;
  if(c.type!=='spell'){
   const front=army.filter(t=>Math.abs(t.x-lane)<115).sort((a,b)=>canonicalY(a.y,s)-canonicalY(b.y,s))[0];
   score=(c.hp*(c.count||1)/600+c.atk*(c.count||1)/65)/Math.sqrt(c.cost);
   if(c.range>=100&&front){y=physicalY(clamp(canonicalY(front.y,s)+65,512,700),s);score+=.7;}
   if(c.ability==='治療'){
    if(!army.length)continue;
    const injured=army.filter(t=>t.hp<t.maxHp).sort((a,b)=>a.hp-b.hp)[0]||front||army[0];
    x=injured.x;y=physicalY(clamp(canonicalY(injured.y,s)+65,512,722),s);
    score=army.filter(t=>t.hp/t.maxHp<.8).length*.55+(army.length>=3?1.2:.2);
   }
   if(c.ability==='攻城'||c.ability==='投石')score+=front&&front.hp>500?1:.1;
   if(c.ability==='克騎'&&enemy.some(t=>t.ability==='突進'&&Math.abs(t.x-lane)<120))score+=.6;
   if(c.ability==='護甲'&&!army.some(t=>t.hp>800&&Math.abs(t.x-lane)<100))score+=.5;
  }else if(['fireball','arrows','lightning','fire'].includes(c.id)){
   const targets=[...enemy,...foeBases],centers=[...targets];
   for(let i=0;i<enemy.length;i++)for(let j=i+1;j<enemy.length&&j<i+5;j++)if(d(enemy[i],enemy[j])<c.radius*2)centers.push({x:(enemy[i].x+enemy[j].x)/2,y:(enemy[i].y+enemy[j].y)/2});
   let best=null;
   for(const center of centers){
    const hit=targets.filter(t=>d(t,center)<=c.radius),value=hit.reduce((n,t)=>{const base=t.tower||t.castle,raw=c.id==='lightning'?(d(t,center)<25?620:310):c.id==='fireball'?300:c.id==='arrows'?240:180;return n+Math.min(t.hp,raw*(base?.3:t.lord?.75:1)*(1-(t.def||0)));},0)/(c.cost*120);
    if(!best||value>best.value)best={x:center.x,y:center.y,value};
   }
   if(!best)continue;({x,y}=best);score=best.value;
   if(score<.6&&p.morale<8)continue;
  }else if(['inspire','guard'].includes(c.id)){
   let best=null;
   for(const center of allies){const active=allies.filter(t=>d(t,center)<=c.radius&&enemy.some(e=>d(t,e)<220));if(!best||active.length>best.count)best={x:center.x,y:center.y,count:active.length};}
   if(!best||best.count<2)continue;({x,y}=best);score=best.count*.45;
  }else if(c.id==='barricade'){
   let best=null;
   for(const center of enemy){const count=enemy.filter(t=>d(t,center)<=c.radius&&t.speed>0).length;if(!best||count>best.count)best={x:center.x,y:center.y,count};}
   if(!best||best.count<2)continue;({x,y}=best);score=best.count*.45;
  }else if(c.id==='ambush'){
   const target=danger||weak;if(!target)continue;x=target.x;y=physicalY(clamp(canonicalY(target.y,s)+35,100,762),s);score=1.7+(army.some(t=>d(t,target)<200)?.5:0);
  }
  const point=placementPoint(x,y,s,c);
  if(point&&(c.type==='spell'||walkable(point)))options.push({index,id:c.id,x:point.x,y:point.y,score:score+r()*.75});
 }
 options.sort((a,b)=>b.score-a.score);
 // Fifteen percent exploration prevents an arbitrary deterministic card tie from suppressing coverage.
 const urgent=danger&&bases.some(t=>d(danger,t)<110);
 let choice=state.saveId&&!urgent&&b.elapsed<=state.saveUntil?options.find(o=>o.id===state.saveId):null;
 if(!choice){state.saveId=null;choice=options.length?(r()<.15?options[Math.floor(r()*options.length)]:options[0]):null;}
 let play=null;
 if(choice){
  const cost=card(choice.id).cost;
  if(cost<=p.morale){play=choice;state.saveId=null;}
  else if(!urgent){state.saveId=choice.id;state.saveUntil=b.elapsed+(cost-p.morale)/(b.time<60?.65:.4)+1.2;}
  else play=options.find(o=>card(o.id).cost<=p.morale)||null;
 }
 return {move,ultimate,play};
}

const games=[],started=Date.now();
function game(pairId,mirror,profiles,seeds){
 const order=mirror?[1,0]:[0,1],players=order.map(i=>profiles[i]),randoms=order.map(i=>rng(seeds[i]));
 const b=new Battle(players[0].faction,players[0].deck,players[1].faction,rng(pairId+77));
 b.sides[1].queue=[...players[1].deck];b.aiTimer=Infinity;
 const states=[{},{}],played=[{},{}],mana=[0,0],opportunities=[{},{}],ults=[0,0];let decision=0,next=0,heals=[0,0],peak=0,invalid=0;
 for(let frame=0;!b.result&&frame<2200;frame++){
  if(!b.pauseRemaining&&b.elapsed+1e-8>=next){
   const plans=[0,1].map(s=>{for(const c of b.hand(s))if(c.cost<=b.sides[s].morale)opportunities[s][c.id]=(opportunities[s][c.id]||0)+1;return plan(b,s,randoms[s],states[s]);});
   // Alternate which abstract player sends its command first, then swap physical sides in the mirror.
   const abstractOrder=decision%2?[1,0]:[0,1];
   for(const abstract of abstractOrder){const s=order.indexOf(abstract),p=plans[s];if(p.move)b.moveLord(s,p.move.x,p.move.y);if(p.play&&b.play(s,p.play.index,p.play.x,p.play.y)){played[s][p.play.id]=(played[s][p.play.id]||0)+1;mana[s]+=card(p.play.id).cost;}}
   for(const abstract of abstractOrder){const s=order.indexOf(abstract);if(plans[s].ultimate&&b.ultimate(s))ults[s]++;}
   next+=.6;decision++;
  }
  const previousElapsed=b.elapsed;b.update(.1);peak=Math.max(peak,b.units.length);
  if(b.elapsed>previousElapsed)for(const e of b.effects)if(e.id==='heal'&&e.age===0)heals[e.side]++;
  if(frame%10===0)for(const u of [...b.units,...b.buildings])if(!Number.isFinite(u.hp)||!Number.isFinite(u.x)||!Number.isFinite(u.y)||!walkable(u))invalid++;
 }
 assert.ok(b.result,`Game ${pairId}/${mirror} did not finish`);assert.equal(invalid,0);
 const row={game:games.length+1,pair:pairId,mirror,winner:b.result.winner,duration:b.elapsed,castleDestroyed:b.buildings.some(t=>t.castle&&t.hp<=0),peakUnits:peak,invalid,
  players:players.map((p,s)=>({...p,abstractPlayer:order[s],seed:seeds[order[s]],plays:played[s],mana:mana[s],opportunities:opportunities[s],ultimate:ults[s],healEvents:heals[s],buildingHP:b.buildings.filter(t=>t.side===s).reduce((n,t)=>n+Math.max(t.hp,0)/t.maxHp,0)}))};
 games.push(row);
 if(games.length%25===0){fs.writeFileSync(path.join(out,'checkpoint.json'),JSON.stringify(games));console.log(JSON.stringify({completed:games.length,seconds:Math.round((Date.now()-started)/1000)}));}
}
let pair=0;
outer:for(let a=0;a<4;a++)for(let b=a;b<4;b++)for(let i=0;i<50;i++){
 const sa=styles[i%5],sb=styles[Math.floor(i/5)%5],va=Math.floor(i/5),vb=i%5+5*Math.floor(i/25);
 const first=decks[`${factions[a]}-${sa}-${va}`],second=a===b?first:decks[`${factions[b]}-${sb}-${vb}`];
 const seeds=[simulationSeed+pair*23,simulationSeed+pair*23+11];
 for(const mirror of [0,1]){game(pair,mirror,[first,second],seeds);if(games.length>=limit)break outer;}pair++;
}

const stat=()=>({appearances:0,wins:0,losses:0,draws:0});
const add=(s,winner,side)=>{s.appearances++;s[winner===-1?'draws':winner===side?'wins':'losses']++;};
const factionStats=Object.fromEntries(factions.map(f=>[f,stat()])),crossStats=Object.fromEntries(factions.map(f=>[f,stat()])),styleStats=Object.fromEntries(styles.map(f=>[f,stat()])),sideStats=[stat(),stat()],matchups={};
const cardStats=Object.fromEntries(CARDS.map(c=>[c.id,{id:c.id,name:c.name,faction:c.faction,type:c.type,cost:c.cost,...stat(),plays:0,playedAppearances:0,opportunities:0,mana:0}]));
const diversity=[],pairResults=new Map();let totalHeals=0,medicGames=0,medicNoHeal=0;
for(const g of games){
 if(!pairResults.has(g.pair))pairResults.set(g.pair,[]);pairResults.get(g.pair).push(g);
 for(const [s,p] of g.players.entries()){
  add(factionStats[p.faction],g.winner,s);add(styleStats[p.style],g.winner,s);add(sideStats[s],g.winner,s);
  if(g.players[0].faction!==g.players[1].faction)add(crossStats[p.faction],g.winner,s);
  const key=p.faction+'>'+g.players[1-s].faction;matchups[key]??=stat();add(matchups[key],g.winner,s);
  for(const id of p.deck){const cs=cardStats[id];add(cs,g.winner,s);cs.plays+=p.plays[id]||0;cs.playedAppearances+=(p.plays[id]||0)>0?1:0;cs.opportunities+=p.opportunities[id]||0;cs.mana+=(p.plays[id]||0)*cs.cost;}
  const counts=Object.values(p.plays),sum=counts.reduce((a,b)=>a+b,0),entropy=sum?counts.reduce((n,v)=>n-v/sum*Math.log(v/sum),0):0;
  diversity.push({distinct:counts.length,total:sum,effective:Math.exp(entropy)});
  totalHeals+=p.healEvents;if(p.plays.medic){medicGames++;if(!p.healEvents)medicNoHeal++;}
 }
}
// Cluster bootstrap resamples mirrored pairs; 2,000 resamples avoid treating mirrors as independent.
function ci(metric){const values=[...pairResults.values()].map(group=>metric(group)),r=rng(93711),samples=[];for(let i=0;i<2000;i++){let num=0,den=0;for(let j=0;j<values.length;j++){const v=values[Math.floor(r()*values.length)];num+=v[0];den+=v[1];}if(den)samples.push(num/den);}samples.sort((a,b)=>a-b);return [samples[Math.floor(samples.length*.025)],samples[Math.floor(samples.length*.975)]];}
for(const f of factions)crossStats[f].pairedBootstrap95=ci(group=>{let n=0,d=0;for(const g of group)if(g.players[0].faction!==g.players[1].faction)for(const [s,p] of g.players.entries())if(p.faction===f){d++;n+=g.winner===s?1:g.winner===-1?.5:0;}return [n,d];});
const sideCI=ci(group=>[group.reduce((n,g)=>n+(g.winner===0?1:g.winner===-1?.5:0),0),group.length]);
const mirror={sameAbstractWinner:0,side0Sweeps:0,side1Sweeps:0,drawBoth:0,mixedDraw:0};
for(const group of pairResults.values()){if(group.length!==2)continue;const [a,b]=group;if(a.winner===-1&&b.winner===-1)mirror.drawBoth++;else if(a.winner===-1||b.winner===-1)mirror.mixedDraw++;else if(a.players[a.winner].abstractPlayer===b.players[b.winner].abstractPlayer)mirror.sameAbstractWinner++;else if(a.winner===0&&b.winner===0)mirror.side0Sweeps++;else if(a.winner===1&&b.winner===1)mirror.side1Sweeps++;}
const sourceHashes=Object.fromEntries(['engine','data','equipment'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,`public/src/${name}.js`))).digest('hex')]));
const summary={commit,seed:simulationSeed,games:games.length,mirrorPairs:pairResults.size,crossFactionGames:games.filter(g=>g.players[0].faction!==g.players[1].faction).length,sameFactionGames:games.filter(g=>g.players[0].faction===g.players[1].faction).length,sourceHashes,
 method:{timestep:.1,decisionInterval:.6,equipment:'none for both',controller:'same tactical controller on both sides; built-in trial AI disabled by aiTimer=Infinity; combat methods unmodified',exploration:.15,economy:'save for a selected unaffordable card until it is affordable; interrupt for immediate base danger',deckStyles:styleNames,deckDesigns:Object.keys(decks).length,sameFactionControl:'identical decks with independent player RNG streams, swapped in mirror',limits:'AI policy and selected deck distribution are not human meta or causal individual-card strength estimates.'},
 factionStats,crossStats,styleStats,sideStats,sideBootstrap95:sideCI,matchups,mirror,cardStats,
 diversity:{includedCards:Object.values(cardStats).filter(c=>c.appearances>0).length,playedCards:Object.values(cardStats).filter(c=>c.plays>0).length,meanDistinct:diversity.reduce((n,d)=>n+d.distinct,0)/diversity.length,meanEffective:diversity.reduce((n,d)=>n+d.effective,0)/diversity.length,totalPlays:diversity.reduce((n,d)=>n+d.total,0),minDistinct:Math.min(...diversity.map(d=>d.distinct)),maxDistinct:Math.max(...diversity.map(d=>d.distinct))},
 averageDuration:games.reduce((n,g)=>n+g.duration,0)/games.length,timeoutGames:games.filter(g=>g.duration>=179.999).length,castleDestroyedGames:games.filter(g=>g.castleDestroyed).length,invalidStates:games.reduce((n,g)=>n+g.invalid,0),medic:{totalHealEvents:totalHeals,deployedPlayerGames:medicGames,zeroHealPlayerGames:medicNoHeal},seconds:(Date.now()-started)/1000};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
fs.writeFileSync(path.join(out,'games.json'),JSON.stringify(games));
fs.writeFileSync(path.join(out,'games.csv'),'game,pair,mirror,faction0,faction1,style0,style1,variant0,variant1,winner,duration,castle_destroyed,deck0,deck1,plays0,plays1\n'+games.map(g=>[g.game,g.pair,g.mirror,...g.players.map(p=>p.faction),...g.players.map(p=>p.style),...g.players.map(p=>p.variant),g.winner,g.duration.toFixed(1),g.castleDestroyed,...g.players.map(p=>p.deck.join('|')),...g.players.map(p=>Object.entries(p.plays).map(([id,n])=>id+':'+n).join('|'))].join(',')).join('\n'));
fs.writeFileSync(path.join(out,'decks.json'),JSON.stringify(decks,null,2));
console.log('FINAL '+JSON.stringify(summary));
