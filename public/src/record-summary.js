import {CARDS,card} from './data.js';
export function summarizeRecords(records,mode,userId){
 const counts=new Map();
 for(const record of records){const deck=mode==='human'?record.players?.find(p=>p.id===userId)?.deck:record.deck;for(const id of new Set(deck||[]))if(card(id))counts.set(id,(counts.get(id)||0)+1);}
 const favorites=['general','troop','spell'].map(type=>{const choices=CARDS.filter(c=>c.type===type&&counts.has(c.id)).sort((a,b)=>counts.get(b.id)-counts.get(a.id)||a.id.localeCompare(b.id));return {type,card:choices[0]||null,count:choices[0]?counts.get(choices[0].id):0};});
 return {favorites,recent:[...records].sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,5)};
}
