import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createGenerationService} from './generation.mjs';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'};
function localRequest(req){
  const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  try{return local&&['127.0.0.1','localhost','[::1]'].includes(new URL('http://'+req.headers.host).hostname);}catch{return false;}
}
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
async function body(req){
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>32768)throw Object.assign(Error('Request is too large.'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw Object.assign(Error('Send a valid JSON request.'),{status:400});}
}
export function createApp({apiKey=(process.env.ELEVENLABS_API_KEY||'').trim(),directory=process.env.FUSE_DATA_DIR||fileURLToPath(new URL('./data/generated/',import.meta.url)),fetchImpl=fetch}={}){
  const generation=createGenerationService({directory,apiKey,fetchImpl});
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{connected:Boolean(apiKey)&&localRequest(req),provider:apiKey?'elevenlabs':null,verified:false,localOnly:true});
      if(url.pathname.startsWith('/api/')){
        if(!localRequest(req))return json(res,403,{error:'Generation and generated files are available only on localhost. Imported-audio mixing still works over your LAN.'});
        if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return json(res,403,{error:'Open the app directly on localhost to use generation.'});
        if(url.pathname==='/api/generate'){
          if(req.method!=='POST')return json(res,405,{error:'Use POST to start generation.'});
          if(!apiKey)return json(res,503,{error:'Audio generation is not connected. Add ELEVENLABS_API_KEY to your local .env file and restart.'});
          return json(res,202,await generation.start(await body(req)));
        }
        const jobRoute=url.pathname.match(/^\/api\/jobs\/([0-9a-f-]{36})$/);
        if(jobRoute){
          if(!['GET','DELETE'].includes(req.method))return json(res,405,{error:'Use GET or DELETE.'});
          const job=await generation[req.method==='DELETE'?'cancel':'get'](jobRoute[1]);return json(res,job?200:404,job||{error:'Generation job not found.'});
        }
        const audioRoute=url.pathname.match(/^\/api\/audio\/([0-9a-f-]{36})$/);
        if(audioRoute&&['GET','HEAD'].includes(req.method)){
          const audio=await generation.audio(audioRoute[1]);if(!audio)return json(res,404,{error:'Generated audio not found.'});
          const headers={'Content-Type':'audio/mpeg','Cache-Control':'no-store','Accept-Ranges':'bytes','Content-Disposition':`${url.searchParams.has('download')?'attachment':'inline'}; filename="fuse-generated.mp3"`};
          let start=0,end=audio.length-1,code=200;
          if(req.headers.range){
            const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
            if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':'bytes */'+audio.length});return res.end();}
            if(!match[1])start=Math.max(0,audio.length-Number(match[2]));
            else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
            if(start>end||start>=audio.length){res.writeHead(416,{'Content-Range':'bytes */'+audio.length});return res.end();}
            code=206;headers['Content-Range']=`bytes ${start}-${end}/${audio.length}`;
          }
          headers['Content-Length']=end-start+1;res.writeHead(code,headers);return res.end(req.method==='HEAD'?undefined:audio.subarray(start,end+1));
        }
        return json(res,404,{error:'API endpoint not found.'});
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
      const pathname=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      const relative=path.relative(root,file);
      if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)){res.writeHead(403);return res.end();}
      try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Not found');}
    }catch(error){return json(res,error.status||500,{error:error.status?error.message:'The server could not complete this operation. Check local storage and restart if needed.'});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.loadEnvFile(fileURLToPath(new URL('./.env',import.meta.url)));}catch(error){if(error.code!=='ENOENT')throw error;}
  const host=process.env.HOST||'127.0.0.1',server=createApp();
  server.listen(Number(process.env.PORT)||3000,host,()=>{
    console.log('Song Fusion Studio: http://'+(host.includes(':')?'['+host+']':host)+':'+server.address().port);
    if(host==='0.0.0.0')console.log('LAN mixing is available; paid generation remains localhost-only.');
  });
}
