import { login, me, getApiToken } from '../../packages/shared/api.mjs';

const form=document.querySelector('#loginForm');
const message=document.querySelector('#authMessage');
const params=new URLSearchParams(location.search);
const requestedReturn=params.get('return')||'';

function safeReturn(value){
  if(!value || !value.startsWith('/') || value.startsWith('//')) return '';
  return value;
}
function roleHome(role){
  if(role==='admin') return '/admin/';
  if(role==='driver') return '/driver/';
  return '/passenger/';
}
function showError(text){message.hidden=false;message.textContent=text;}
function targetAllowed(target,role){
  if(!target)return false;
  if(target.startsWith('/admin/'))return role==='admin';
  if(target.startsWith('/driver/'))return role==='driver'||role==='admin';
  if(target.startsWith('/passenger/'))return role==='passenger'||role==='admin';
  return target.startsWith('/website/')||target.startsWith('/track-package/');
}
function redirectFor(user){
  const target=safeReturn(requestedReturn);
  if(targetAllowed(target,user?.role)){location.replace(target);return;}
  location.replace(roleHome(user?.role));
}

if(getApiToken()){
  me().then(payload=>redirectFor(payload.user??payload.data?.user??payload)).catch(()=>{});
}

form?.addEventListener('submit',async event=>{
  event.preventDefault();
  message.hidden=true;
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;button.textContent='Signing in…';
  try{
    const data=new FormData(form);
    const result=await login(String(data.get('email')??''),String(data.get('password')??''));
    redirectFor(result.user);
  }catch(error){showError(error.message||'Unable to sign in.');button.disabled=false;button.textContent='Sign in';}
});
