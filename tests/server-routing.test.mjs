import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const port=4197;const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',LARAVEL_API_URL:'http://127.0.0.1:65534'},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server start timeout')),5000);child.stdout.on('data',d=>{if(String(d).includes('Encore Transport running')){clearTimeout(timer);resolve();}});child.once('exit',code=>reject(new Error(`Server exited ${code}`)));});
 const root=await fetch(`http://127.0.0.1:${port}/`,{redirect:'manual'});assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/website/');
 const website=await fetch(`http://127.0.0.1:${port}/website/`);assert.equal(website.status,200);assert.match(await website.text(),/Encore Transport/);
 const css=await fetch(`http://127.0.0.1:${port}/website/styles.css`);assert.equal(css.status,200);assert.match(css.headers.get('content-type')??'',/text\/css/);
 const legacy=await fetch(`http://127.0.0.1:${port}/move/`,{redirect:'manual'});assert.equal(legacy.status,302);assert.equal(legacy.headers.get('location'),'/passenger/');
 console.log('Server routing tests passed');
}finally{child.kill('SIGTERM');}
