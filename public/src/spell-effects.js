const COLORS={fireball:'#e99b53',fire:'#e3874d',lightning:'#a9d7ee',arrows:'#dcc795',inspire:'#b6cf91',guard:'#9fc7dc',barricade:'#bd9976',ambush:'#c9b4db'};
const TAU=Math.PI*2;
const clamp01=v=>Math.max(0,Math.min(1,v));
const easeOut=v=>1-(1-clamp01(v))**3;
const seed=i=>((i*9301+49297)%233280)/233280;

export function drawSpellEffect(ctx,e){
 if(!Object.hasOwn(COLORS,e.id))return false;
 const r=e.radius||40,age=e.age,t=clamp01(age/e.duration),color=COLORS[e.id];
 ctx.save();ctx.translate(e.x,e.y);ctx.lineCap='round';ctx.lineJoin='round';
 const circle=(radius,stroke,alpha=1,width=2,fill=null)=>{
  ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.beginPath();ctx.arc(0,0,Math.max(1,radius),0,TAU);
  if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.stroke();
 };
 const glow=(radius,inner,outer,alpha=1)=>{
  const g=ctx.createRadialGradient(0,0,0,0,0,Math.max(1,radius));
  g.addColorStop(0,inner);g.addColorStop(.3,color);g.addColorStop(1,outer);
  ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.fill();
 };
 const spark=(a,d,len,w,alpha,stroke=color)=>{
  const x=Math.cos(a)*d,y=Math.sin(a)*d,dx=Math.cos(a)*len,dy=Math.sin(a)*len;
  ctx.globalAlpha=alpha;ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x-dx*.25,y-dy*.25);ctx.lineTo(x+dx,y+dy);ctx.stroke();
 };

 if(e.id==='fireball'){
  const impact=.25;
  if(age<impact){
   const p=easeOut(age/impact),drop=1-p;
   ctx.save();ctx.globalCompositeOperation='lighter';
   glow(20+18*p,'#fff7dc','#e99b5300',.8);
   const headY=-115*drop,headX=-34*drop;
   const g=ctx.createRadialGradient(headX,headY,0,headX,headY,22);
   g.addColorStop(0,'#fffdf2');g.addColorStop(.22,'#ffd26f');g.addColorStop(.65,'#ef6f38');g.addColorStop(1,'#ef6f3800');
   ctx.globalAlpha=.95;ctx.fillStyle=g;ctx.beginPath();ctx.arc(headX,headY,22,0,TAU);ctx.fill();
   for(let i=0;i<9;i++){const q=seed(i),a=1.7+q*.9,d=(1-p)*(24+i*8);spark(a,d,10+8*q,2,.45+q*.35,'#ffcf67');}
   ctx.restore();
   circle(r*(.7+.12*Math.sin(age*22)),color,.5,2);
  }else{
   const p=clamp01((age-impact)/(e.duration-impact)),burst=easeOut(Math.min(1,p*2.2));
   ctx.save();ctx.globalCompositeOperation='lighter';
   glow(r*(.25+.9*burst),'#fff9dd','#e25c2a00',1-p*.78);
   circle(r*(.2+.95*burst),'#ffd98b',1-p,5-3*p);
   circle(r*(.32+1.08*burst),'#e96a36',.7*(1-p),2);
   for(let i=0;i<22;i++){const a=i/22*TAU+seed(i)*.18,d=r*(.12+.92*burst)*( .65+seed(i+30)*.45);spark(a,d,7+14*(1-p),1.3+2*(1-p),1-p*.9,i%3?'#f19a48':'#fff0a8');}
   ctx.globalAlpha=.28*(1-p);ctx.fillStyle='#4b251e';ctx.beginPath();ctx.ellipse(0,7,r*(.45+.35*burst),r*(.14+.12*burst),0,0,TAU);ctx.fill();
   ctx.restore();
  }
 }else if(e.id==='lightning'){
  const impact=.8;
  if(age<impact){
   const pulse=.5+.5*Math.sin(age*28),p=age/impact;
   ctx.setLineDash([7,7]);circle(r*(.82+.05*p),'#9edfff',.45+.25*pulse,2);ctx.setLineDash([]);
   circle(r*.18,'#dff7ff',.6+.3*pulse,2);
   ctx.globalAlpha=.18+.08*pulse;ctx.fillStyle='#bdeaff';ctx.beginPath();ctx.arc(0,0,r*.62,0,TAU);ctx.fill();
   for(let i=0;i<4;i++){const a=i*Math.PI/2+age*2; spark(a,r*.28,10,1.5,.5,'#dff8ff');}
  }else{
   const p=clamp01((age-impact)/(e.duration-impact));
   ctx.save();ctx.globalCompositeOperation='lighter';
   ctx.globalAlpha=.22*(1-p);ctx.fillStyle='#eefcff';ctx.fillRect(-r*1.15,-150,r*2.3,180);
   const bolts=[[-15,-145,8,-110,-9,-80,5,-50,0,0],[20,-142,4,-105,18,-78,7,-45,0,0],[-42,-122,-24,-92,-35,-63,-12,-33,0,0]];
   for(let j=0;j<bolts.length;j++){
    const b=bolts[j];ctx.globalAlpha=(j? .55:.95)*(1-p*.7);ctx.strokeStyle=j?'#9ee8ff':'#f4fdff';ctx.lineWidth=j?3:7;ctx.beginPath();ctx.moveTo(b[0],b[1]);for(let i=2;i<b.length;i+=2)ctx.lineTo(b[i],b[i+1]);ctx.stroke();
   }
   glow(r*.72,'#ffffff','#8edcff00',.9*(1-p));
   circle(r*(.18+.82*easeOut(p)),'#dffaff',1-p,4-2*p);
   for(let i=0;i<14;i++){const a=seed(i)*TAU,d=r*(.25+.65*easeOut(p))*seed(i+20);spark(a,d,5+8*seed(i+40),1.5,.8*(1-p),'#b9efff');}
   ctx.restore();
  }
 }else if(e.id==='arrows'){
  const fade=t>.84?(1-t)/.16:1;
  ctx.globalAlpha=.22*fade;ctx.fillStyle='#5b5142';ctx.beginPath();ctx.arc(0,6,r*.92,0,TAU);ctx.fill();
  circle(r,'#cdbb85',.25*fade,1.5);
  for(let i=0;i<22;i++){
   const delay=(i%6)*.055+seed(i)*.08,cycle=.34,phase=((age-delay)%cycle+cycle)%cycle/cycle;
   const a=seed(i+11)*TAU,d=r*Math.sqrt(seed(i+31))*.88,x=Math.cos(a)*d,yBase=Math.sin(a)*d*.72;
   const y=yBase-82*(1-phase),x2=x-18*(1-phase);
   ctx.save();ctx.translate(x2,y);ctx.rotate(.82);ctx.globalAlpha=fade*(.45+.55*phase);ctx.strokeStyle=i%4===0?'#f1dfaa':'#cdbb85';ctx.lineWidth=2.2;
   ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(8,0);ctx.moveTo(-10,-3);ctx.lineTo(-4,0);ctx.lineTo(-10,3);ctx.moveTo(4,-3);ctx.lineTo(8,0);ctx.lineTo(4,3);ctx.stroke();ctx.restore();
   if(phase>.82){const q=(phase-.82)/.18;ctx.globalAlpha=(1-q)*.35*fade;ctx.strokeStyle='#d9cda8';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,yBase,4+8*q,0,TAU);ctx.stroke();}
  }
 }else if(e.id==='fire'){
  glow(r,'#ffdf8c','#e3874d00',.22);ctx.globalAlpha=.78*(t>.9?(1-t)*10:1);
  for(let i=0;i<18;i++){const a=i*2.399,d=r*Math.sqrt((i+.5)/18)*.86,x=Math.cos(a)*d,y=Math.sin(a)*d,h=12+13*(.5+.5*Math.sin(age*13+i));ctx.fillStyle=i%3?'#df7b42':'#f3b552';ctx.beginPath();ctx.moveTo(x-5,y+5);ctx.quadraticCurveTo(x-8,y-5,x+2,y-h);ctx.quadraticCurveTo(x+9,y-2,x+5,y+5);ctx.closePath();ctx.fill();}
 }else if(e.id==='barricade'){
  ctx.globalAlpha=.8;ctx.strokeStyle=color;ctx.lineWidth=5;for(let i=-1;i<=1;i++){const x=i*r*.55;ctx.beginPath();ctx.moveTo(x-12,-16);ctx.lineTo(x+12,16);ctx.moveTo(x+12,-16);ctx.lineTo(x-12,16);ctx.stroke();}
 }else{
  glow(r,'#fff7df',color+'00',.18*(1-t));for(let i=0;i<2;i++)circle(r*((t+i*.5)%1),color,.8*(1-t),2);
  ctx.globalAlpha=1-t;ctx.strokeStyle=color;ctx.lineWidth=4;
  if(e.id==='guard'){ctx.beginPath();ctx.moveTo(-17,-20);ctx.lineTo(17,-20);ctx.lineTo(15,6);ctx.quadraticCurveTo(0,28,-15,6);ctx.closePath();ctx.stroke();}
  else if(e.id==='inspire'){for(const y of [-8,10]){ctx.beginPath();ctx.moveTo(-14,y);ctx.lineTo(0,y-14);ctx.lineTo(14,y);ctx.stroke();}}
  else for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*r*(1-t),Math.sin(a)*r*(1-t));ctx.stroke();}
 }
 ctx.restore();return true;
}
