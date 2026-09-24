const PROJECT_URL=Deno.env.get("SUPABASE_URL")||"";
const AUTH_KEY=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||"";
const SITE_ORIGIN=Deno.env.get("SITE_ORIGIN")||"";
const cors=origin=>({"access-control-allow-origin":origin,"access-control-allow-headers":"authorization, apikey, content-type","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"});
const reply=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function originAllowed(origin){
 if(!origin||!SERVICE_KEY)return false;
 const r=await fetch(PROJECT_URL+"/rest/v1/rpc/is_site_origin_allowed",{method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json"},body:JSON.stringify({p_origin:origin}),signal:AbortSignal.timeout(4000)});
 return r.ok&&await r.json()===true;
}
async function admin(token){
 if(!token||!AUTH_KEY)return false;
 const u=await fetch(PROJECT_URL+"/auth/v1/user",{headers:{apikey:AUTH_KEY,authorization:"Bearer "+token},signal:AbortSignal.timeout(5000)});
 if(!u.ok)return false;const user=await u.json();if(!user.id)return false;
 const p=await fetch(PROJECT_URL+"/rest/v1/profiles?select=role&id=eq."+encodeURIComponent(user.id)+"&limit=1",{headers:{apikey:AUTH_KEY,authorization:"Bearer "+token},signal:AbortSignal.timeout(5000)});
 if(!p.ok)return false;const rows=await p.json();return rows.some(x=>x.role==="admin");
}
Deno.serve(async request=>{
 const origin=request.headers.get("origin")||"";
 if(!SITE_ORIGIN||origin!==SITE_ORIGIN||!await originAllowed(origin))return reply({error:"İstek doğrulanamadı."},403,origin||"null");
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 if(request.method!=="POST")return reply({error:"Yalnızca POST kabul edilir."},405,origin);
 const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 try{if(!await admin(token))return reply({error:"Yönetici yetkisi gerekir."},403,origin)}catch{return reply({error:"Oturum doğrulanamadı."},401,origin)}
 const bot=Deno.env.get("TELEGRAM_BOT_TOKEN");if(!bot||!SERVICE_KEY)return reply({error:"Telegram bildirimi yapılandırılmamış."},503,origin);
 let input;try{input=await request.json()}catch{return reply({error:"İstek gövdesi geçersiz."},400,origin)}
 if(input?.source!=="admin-test")return reply({error:"Desteklenmeyen bildirim türü."},400,origin);
 try{
  const chatResult=await fetch(PROJECT_URL+"/rest/v1/rpc/get_telegram_chat_id",{method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json"},body:"{}",signal:AbortSignal.timeout(4000)});
  if(!chatResult.ok)return reply({error:"Telegram hedefi bulunamadı."},503,origin);
  const chat=await chatResult.json();if(!chat)return reply({error:"Telegram hedefi bulunamadı."},503,origin);
  const sent=await fetch("https://api.telegram.org/bot"+bot+"/sendMessage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chat,text:"Ahmet Ali Ünal yönetim paneli bağlantı testi. Mesaj, bağlantı doğrulaması için gönderildi.",disable_web_page_preview:true}),signal:AbortSignal.timeout(7000)});
  const result=await sent.json().catch(()=>({}));if(!sent.ok||!result.ok)return reply({error:"Telegram servisi mesajı kabul etmedi."},502,origin);
  return reply({success:true},200,origin);
 }catch{return reply({error:"Telegram servisi şu anda kullanılamıyor."},503,origin)}
});
