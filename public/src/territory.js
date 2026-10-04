// Displayed territory is a strength projection of server-side PvP contribution,
// rather than a claim that individual historical provinces have been captured.
export const TERRITORY_KEYS=['shu','wei','wu','qun'];
const ANCHORS=[[.29,.60],[.66,.32],[.78,.65],[.31,.29]];
export function territoryShares(factions,total=10000){
  const scores=TERRITORY_KEYS.map(f=>Math.max(0,Number(factions[f]?.contribution)||0));
  const sum=scores.reduce((a,b)=>a+b,0);
  if(!sum)return Object.fromEntries(TERRITORY_KEYS.map(f=>[f,0]));
  const raw=scores.map(s=>s/sum*total),counts=raw.map(Math.floor);
  const order=raw.map((v,i)=>({i,remainder:v-counts[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
  for(let n=total-counts.reduce((a,b)=>a+b,0),i=0;i<n;i++)counts[order[i].i]++;
  return Object.fromEntries(TERRITORY_KEYS.map((f,i)=>[f,counts[i]]));
}
export function territoryPixels(alpha,width,height,shares){
  const pixels=[];for(let i=0;i<alpha.length;i++)if(alpha[i]>=128)pixels.push(i);
  const counts=territoryShares(Object.fromEntries(TERRITORY_KEYS.map(f=>[f,{contribution:shares[f]||0}])),pixels.length);
  const owners=new Int8Array(alpha.length).fill(-1);
  if(!TERRITORY_KEYS.some(f=>counts[f]>0))return {owners,counts};
  // Grow each faction from its geographical anchor, reserving an exact pixel quota.
  const edges=[];
  for(let f=0;f<4;f++)if(counts[TERRITORY_KEYS[f]])for(const p of pixels){const x=p%width/width,y=Math.floor(p/width)/height;edges.push({p,f,d:(x-ANCHORS[f][0])**2+(y-ANCHORS[f][1])**2});}
  edges.sort((a,b)=>a.d-b.d||a.f-b.f||a.p-b.p);
  const remaining={...counts};
  for(const {p,f} of edges)if(owners[p]===-1&&remaining[TERRITORY_KEYS[f]]>0){owners[p]=f;remaining[TERRITORY_KEYS[f]]--;}
  return {owners,counts};
}
