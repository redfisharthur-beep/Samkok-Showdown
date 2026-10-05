// Normalize only card UI artwork; preserve source assets and image proportions.
const cache=new Map();
export function cardArtwork(image){
 const source=image.currentSrc||image.src;if(cache.has(source))return cache.get(source);
 const w=image.naturalWidth,h=image.naturalHeight;if(!w||!h)return source;
 const scan=document.createElement('canvas'),scale=Math.min(1,512/Math.max(w,h));
 scan.width=Math.max(1,Math.round(w*scale));scan.height=Math.max(1,Math.round(h*scale));
 const ctx=scan.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,scan.width,scan.height);
 const pixels=ctx.getImageData(0,0,scan.width,scan.height).data;
 let left=scan.width,top=scan.height,right=-1,bottom=-1;
 for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++)if(pixels[(y*scan.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left)return source;
 left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(scan.width,right+3);bottom=Math.min(scan.height,bottom+3);
 const sx=left*w/scan.width,sy=top*h/scan.height,sw=(right-left)*w/scan.width,sh=(bottom-top)*h/scan.height;
 const canvas=document.createElement('canvas');canvas.width=600;canvas.height=800;
 const factor=Math.min(600/sw,800/sh),dw=sw*factor,dh=sh*factor;
 canvas.getContext('2d').drawImage(image,sx,sy,sw,sh,(600-dw)/2,(800-dh)/2,dw,dh);
 const result=canvas.toDataURL('image/png');cache.set(source,result);return result;
}
