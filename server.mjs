import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'};
const server=http.createServer(async(req,res)=>{
  if(req.url==='/api/status'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({connected:false,provider:null}));}
  if(req.url==='/api/generate'){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Audio generation is not connected yet. Save your recipe or export the brief to use with a music provider.'}));}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));const relative=path.relative(root,file);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)){res.writeHead(403);return res.end();}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Not found');}
});
const host=process.env.HOST||'127.0.0.1';
server.listen(Number(process.env.PORT)||3000,host,()=>{
  console.log('Song Fusion Studio: http://'+(host.includes(':')?'['+host+']':host)+':'+server.address().port);
  if(host==='0.0.0.0')console.log('Phone testing: open http://<this computer’s Wi-Fi IPv4 address>:'+server.address().port+' on a phone connected to the same network.');
});
