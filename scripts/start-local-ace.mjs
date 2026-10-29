import {spawn} from 'node:child_process';
import {access,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const aceRoot=path.join(projectRoot,'data/local-ai/ACE-Step-1.5');
const python=path.join(aceRoot,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
await access(python);
try{await writeFile(path.join(aceRoot,'.env'),'# Local ACE-Step only. No paid provider credentials.\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
const env={...process.env,ACESTEP_INIT_LLM:'false',ACESTEP_NO_INIT:'false',ACESTEP_DEVICE:'cuda',ACESTEP_CONFIG_PATH:'acestep-v15-turbo',ACESTEP_OFFLOAD_TO_CPU:'true',ACESTEP_OFFLOAD_DIT_TO_CPU:'true',ACESTEP_USE_FLASH_ATTENTION:'false',ACESTEP_COMPILE_MODEL:'false',ACESTEP_LM_BACKEND:'pt',ACESTEP_API_WORKERS:'1',ACESTEP_QUEUE_WORKERS:'1',HF_HOME:path.join(projectRoot,'data/local-ai/hf-cache'),HF_HUB_DISABLE_TELEMETRY:'1',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',PYTHONUTF8:'1',PYTHONUNBUFFERED:'1',OMP_NUM_THREADS:'4',MKL_NUM_THREADS:'4'};
delete env.ELEVENLABS_API_KEY;
const child=spawn(python,['-m','acestep.api_server','--host','127.0.0.1','--port',process.env.ACESTEP_API_PORT||'8001'],{cwd:aceRoot,env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error('Could not start local engine:',error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});
process.on('SIGINT',()=>child.kill());
process.on('SIGTERM',()=>child.kill());
