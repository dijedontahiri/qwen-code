import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { startFakeOpenAIServer, fakeToolCall } from '../../integration-tests/fake-openai-server.ts';

const phase = process.argv[2];
assert.ok(phase === 'before' || phase === 'after');
const groups = Number(process.argv[3] || 30000);
const heapMiB = Number(process.argv[4] || 384);
const evidence = path.resolve(process.argv[5]);
const bundle = path.resolve('dist/cli.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-12151-cli-'));
let server;
try {
  assert.equal(spawnSync('git',['init','--quiet',root]).status,0);
  fs.writeFileSync(path.join(root,'.gitignore'),Array.from({length:45},(_,i)=>`*.ignored-${i}`).join('\n'));
  for(let i=0;i<groups;i++) fs.mkdirSync(path.join(root,`scratch-${i}`,'nested'),{recursive:true});
  fs.writeFileSync(path.join(root,'needle.txt'),'only expected match');
  fs.mkdirSync(path.join(root,'.qwen'));
  fs.writeFileSync(path.join(root,'.qwen','settings.json'),JSON.stringify({sandbox:false,telemetry:{enabled:false}}));
  fs.mkdirSync(path.join(root, 'home', '.qwen'), { recursive: true });
  fs.mkdirSync(path.join(root, 'runtime'));
  let streamIndex=0;
  server=await startFakeOpenAIServer(({body})=>{
    if(body.stream!==true) return {content:'{"selected_memories":[]}'};
    if(streamIndex++===0) return {toolCalls:[fakeToolCall('glob',{pattern:'**/needle.txt'},'memory-proof')]};
    return {content:'CLI_MEMORY_PROOF_COMPLETE'};
  });
  const env={...process.env,HOME:path.join(root,'home'),QWEN_HOME:path.join(root,'home','.qwen'),QWEN_RUNTIME_DIR:path.join(root,'runtime'),QWEN_DEBUG_LOG_FILE:'0',QWEN_SANDBOX:'false',OPENAI_API_KEY:'fake-key',OPENAI_BASE_URL:server.baseUrl,OPENAI_MODEL:'fake-model',QWEN_MODEL:'fake-model',NO_PROXY:'127.0.0.1,localhost',no_proxy:'127.0.0.1,localhost'};
  delete env.NODE_OPTIONS;
  const args=[`--max-old-space-size=${heapMiB}`,bundle,'--no-chat-recording','--yolo','--prompt','Find needle.txt files using glob.','--auth-type','openai','--model','fake-model','--openai-base-url',server.baseUrl,'--openai-api-key','fake-key'];
  const child=spawn(process.execPath,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',timedOut=false;
  child.stdout.on('data',data=>stdout+=data.toString());
  child.stderr.on('data',data=>stderr+=data.toString());
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},150000);
  const result=await new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('close',(code,signal)=>resolve({code,signal}));
  });
  clearTimeout(timer);
  const messages=server.requests.flatMap(({body})=>Array.isArray(body.messages)?body.messages:[]);
  const toolResults=messages.filter(m=>m.role==='tool'&&m.tool_call_id==='memory-proof');
  const content=JSON.stringify(toolResults.at(-1)?.content);
  const observed={phase,node:process.version,heapLimitFlagMiB:heapMiB,scratchDirectories:groups*2,exitCode:result.code,signal:result.signal,timedOut,streamingRequests:streamIndex,toolResultReturned:toolResults.length>0,correctPathReturned:content?.includes(path.join(root,'needle.txt'))??false,observedHeapOutOfMemory:stderr.includes('heap out of memory'),completed:stdout.includes('CLI_MEMORY_PROOF_COMPLETE')};
  fs.writeFileSync(path.join(evidence,`cli-memory-${phase}.stdout`),stdout);
  fs.writeFileSync(path.join(evidence,`cli-memory-${phase}.stderr`),stderr);
  fs.writeFileSync(path.join(evidence,`cli-memory-${phase}.json`),JSON.stringify(observed,null,2)+'\n');
  console.log(JSON.stringify(observed,null,2));
  assert.equal(timedOut,false,'Child process timed out');
  assert.ok(streamIndex>=1,'CLI must reach the requested tool call before the memory check');
  if(phase==='before') assert.equal(observed.observedHeapOutOfMemory,true,'Baseline must fail from memory pressure, not a setup error');
  else {
    assert.equal(result.code,0,stderr);
    assert.equal(observed.correctPathReturned,true);
    assert.equal(observed.completed,true,stdout);
  }
} finally {
  await server?.close();
  fs.rmSync(root,{recursive:true,force:true});
}
