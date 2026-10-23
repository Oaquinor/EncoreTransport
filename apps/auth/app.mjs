import { login, me, getApiToken } from '../../packages/shared/api.mjs';

const form=document.querySelector('#loginForm');
const message=document.querySelector('#authMessage');
const params=new URLSearchParams(location.search);
const requestedReturn=params.get('return')||'';

function safeReturn(value){
  if(!value || !value.startsWith('/') || value.startsWith('//')) return '';
  return value;
}
function roleHome(user){
  const permissions = new Set(user?.permissions ?? []);
  if(permissions.has('dashboard.view')) return '/admin/';
  if(permissions.has('driver.access')) return '/driver/';
  return '/passenger/';
}
function showError(text){message.hidden=false;message.textContent=text;}
function targetAllowed(target,user){
  const permissions = new Set(user?.permissions ?? []);
  if(!target)return false;
  if(target.startsWith('/admin/'))return permissions.has('dashboard.view');
  if(target.startsWith('/driver/'))return permissions.has('driver.access');
  if(target.startsWith('/passenger/'))return Boolean(user?.active);
  return target.startsWith('/website/')||target.startsWith('/track-package/');
}
function redirectFor(user){
  const target=safeReturn(requestedReturn);
  if(targetAllowed(target,user)){location.replace(target);return;}
  location.replace(roleHome(user));
}

if(getApiToken()){
  me().then(payload=>{
    const user = payload.user ?? payload.data?.user ?? payload;
    redirectFor({...user, permissions: payload.permissions ?? user.permissions ?? []});
  }).catch(()=>{});
}

form?.addEventListener('submit',async event=>{
  event.preventDefault();
  message.hidden=true;
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;button.textContent='Signing in…';
  try{
    const data=new FormData(form);
    const result=await login(String(data.get('email')??''),String(data.get('password')??''));
    redirectFor({...result.user, permissions: result.permissions ?? []});
  }catch(error){showError(error.message||'Unable to sign in.');button.disabled=false;button.textContent='Sign in';}
});
