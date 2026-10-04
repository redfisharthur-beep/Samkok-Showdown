const COLORS={fireball:'#e99b53',fire:'#e3874d',lightning:'#a9d7ee',arrows:'#dcc795',inspire:'#b6cf91',guard:'#9fc7dc',barricade:'#bd9976',ambush:'#c9b4db'};
export function drawSpellEffect(ctx,e){
 if(!Object.hasOwn(COLORS,e.id))return false;
 const r=e.radius,age=e.age,t=Math.min(1,age/e.duration),color=COLORS[e.id];
 ctx.save();ctx.translate(e.x,e.y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=3;
 const ring=(radius,alpha=1)=>{ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(0,0,Math.max(1,radius),0,Math.PI*2);ctx.stroke();};
 const glow=(radius,alpha)=>{const g=ctx.createRadialGradient(0,0,0,0,0,radius);g.addColorStop(0,'#fff2d5');g.addColorStop(.25,color);g.addColorStop(1,color+'00');ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;};
 ring(r,.65*(1-t*.5));
 if(e.id==='fireball'){
  if(age<.25){const p=age/.25;glow(16+p*18,.9);ctx.globalAlpha=.8;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-28*(1-p),-95*(1-p));ctx.lineTo(0,0);ctx.stroke();}
  else{const p=Math.min(1,(age-.25)/.35);glow(r*(.4+.6*p),1-p*.8);ring(r*(.25+.75*p),1-p);ctx.globalAlpha=1-p;for(let i=0;i<12;i++){const a=i*Math.PI/6,d=r*p;ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d,3*(1-p)+1,0,Math.PI*2);ctx.fill();}}
 }else if(e.id==='lightning'){
  if(age<.8){ctx.setLineDash([8,6]);ring(r*(.75+.12*Math.sin(age*15)),.8);ctx.setLineDash([]);ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.stroke();}
  else{glow(r,Math.max(0,1-(age-.8)/.2));ctx.globalAlpha=1;ctx.strokeStyle='#eff9ff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-15,-135);ctx.lineTo(10,-90);ctx.lineTo(-12,-60);ctx.lineTo(8,-30);ctx.lineTo(0,0);ctx.stroke();}
 }else if(e.id==='arrows'){
  ctx.globalAlpha=1-t*.5;ctx.lineWidth=3;for(let i=0;i<12;i++){const phase=(age/.35+i*.13)%1,a=i*2.399,d=r*Math.sqrt((i+.5)/12),x=Math.cos(a)*d,y=Math.sin(a)*d-60*(1-phase);ctx.beginPath();ctx.moveTo(x-12,y-24);ctx.lineTo(x,y);ctx.moveTo(x-7,y-2);ctx.lineTo(x,y);ctx.lineTo(x+2,y-8);ctx.stroke();}
 }else if(e.id==='fire'){
  glow(r,.25);ctx.globalAlpha=.85*(t>.9?(1-t)*10:1);for(let i=0;i<15;i++){const a=i*2.399,d=r*Math.sqrt((i+.5)/15)*.85,x=Math.cos(a)*d,y=Math.sin(a)*d,h=10+10*(.5+.5*Math.sin(age*12+i));ctx.beginPath();ctx.moveTo(x-5,y+5);ctx.quadraticCurveTo(x-8,y-5,x+2,y-h);ctx.quadraticCurveTo(x+9,y-2,x+5,y+5);ctx.closePath();ctx.fill();}
 }else if(e.id==='barricade'){
  ctx.globalAlpha=.8;ctx.lineWidth=5;for(let i=-1;i<=1;i++){const x=i*r*.55;ctx.beginPath();ctx.moveTo(x-12,-16);ctx.lineTo(x+12,16);ctx.moveTo(x+12,-16);ctx.lineTo(x-12,16);ctx.stroke();}
 }else{
  glow(r,.18*(1-t));for(let i=0;i<2;i++)ring(r*((t+i*.5)%1),.8*(1-t));ctx.globalAlpha=1-t;ctx.lineWidth=4;
  if(e.id==='guard'){ctx.beginPath();ctx.moveTo(-17,-20);ctx.lineTo(17,-20);ctx.lineTo(15,6);ctx.quadraticCurveTo(0,28,-15,6);ctx.closePath();ctx.stroke();}
  else if(e.id==='inspire'){for(const y of [-8,10]){ctx.beginPath();ctx.moveTo(-14,y);ctx.lineTo(0,y-14);ctx.lineTo(14,y);ctx.stroke();}}
  else for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*r*(1-t),Math.sin(a)*r*(1-t));ctx.stroke();}
 }
 ctx.restore();return true;
}
