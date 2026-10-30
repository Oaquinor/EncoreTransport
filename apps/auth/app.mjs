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

async function signInWithGoogle(credential){
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetch('/api/v1/auth/google', {
    method:'POST',
    headers:{'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({credential}),
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(error?.name === 'AbortError' ? 'Google sign-in timed out. Please try again.' : 'Unable to reach the authentication service.');
  } finally {
    clearTimeout(timeoutId);
  }
  const payload = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload.message||'Google sign-in failed.');
  sessionStorage.setItem('encore_api_token',payload.token);
  redirectFor({...payload.user,permissions:payload.permissions||[]});
}

function mountGoogleSignIn(){
  const target=document.querySelector('#googleSignIn');
  const clientId=document.querySelector('meta[name="google-client-id"]')?.content;
  if(!target||!clientId)return;
  const render=()=>{
    if(!window.google?.accounts?.id)return false;
    window.google.accounts.id.initialize({client_id:clientId,callback:({credential})=>{
      signInWithGoogle(credential).catch(error=>showError(error.message));
    }});
    window.google.accounts.id.renderButton(target,{theme:'outline',size:'large',width:360,text:'continue_with'});
    return true;
  };
  if(render())return;
  let attempts=0;
  const timer=setInterval(()=>{if(render()||++attempts>20)clearInterval(timer)},250);
}

if(getApiToken()){
  me().then(payload=>{
    const user = payload.user ?? payload.data?.user ?? payload;
    redirectFor({...user, permissions: payload.permissions ?? user.permissions ?? []});
  }).catch(()=>{});
}

mountGoogleSignIn();

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
