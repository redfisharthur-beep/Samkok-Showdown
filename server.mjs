import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('public');
http.createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==root&&!p.startsWith(root+'/'))throw Error();const f=await readFile(p===root?root+'/index.html':p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'})[extname(p)]||'application/octet-stream');res.end(f);}catch{res.writeHead(404);res.end('Not found');}}).listen(process.env.PORT||3000);
