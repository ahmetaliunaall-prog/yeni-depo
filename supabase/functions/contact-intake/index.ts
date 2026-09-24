const PROJECT_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||"";
const SITE_ORIGIN=Deno.env.get("SITE_ORIGIN")||"";
const cors=origin=>({"access-control-allow-origin":origin,"access-control-allow-headers":"authorization, apikey, content-type","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"});
const reply=(data,status,origin)=>new Response(JSON.stringify(data),{status,headers:{...cors(origin),"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function allowed(origin){
  if(!SERVICE_KEY||!PROJECT_URL||!origin)return false;
  const response=await fetch(PROJECT_URL+"/rest/v1/rpc/is_site_origin_allowed",{method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json"},body:JSON.stringify({p_origin:origin}),signal:AbortSignal.timeout(4000)});
  return response.ok&&await response.json()===true;
}
function text(input,key,max){return typeof input[key]==="string"?input[key].trim().slice(0,max):""}
async function notify(){
  const token=Deno.env.get("TELEGRAM_BOT_TOKEN");if(!token)return;
  try{
    const response=await fetch(PROJECT_URL+"/rest/v1/rpc/get_telegram_chat_id",{method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json"},body:"{}",signal:AbortSignal.timeout(3000)});
    const chat=response.ok?await response.json():null;if(!chat)return;
    await fetch("https://api.telegram.org/bot"+token+"/sendMessage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chat,text:"Web sitesine yeni bir iletişim talebi geldi. Yönetim panelinden inceleyin.",disable_web_page_preview:true}),signal:AbortSignal.timeout(4000)});
  }catch{/* The saved request remains successful if notification is unavailable. */}
}
Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(!origin||origin!==SITE_ORIGIN||!origin.startsWith("https://")||!await allowed(origin))return reply({error:"İstek doğrulanamadı."},403,origin||"null");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=="POST")return reply({error:"Bu istek desteklenmiyor."},405,origin);
  if(!SERVICE_KEY||!PROJECT_URL)return reply({error:"İletişim servisi yapılandırılmamış."},503,origin);
  let input;
  try{
    if(Number(request.headers.get("content-length")||0)>16384)return reply({error:"Form bilgileri geçersiz."},413,origin);
    input=await request.json();if(JSON.stringify(input).length>16384)return reply({error:"Form bilgileri geçersiz."},413,origin);
  }catch{return reply({error:"Form bilgileri geçersiz."},400,origin)}
  if(text(input,"website",200))return reply({ok:true},200,origin);
  const name=text(input,"name",100),surname=text(input,"surname",100),email=text(input,"email",254).toLowerCase();
  const phone=text(input,"phone",40),subject=text(input,"subject",160),message=text(input,"message",5000);
  const preference=text(input,"contact_preference",10)||"email";
  if(!name||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<10||input.consent!==true||!["email","phone"].includes(preference))return reply({error:"Gerekli alanları doğru biçimde doldurun."},400,origin);
  const turnstileSecret=Deno.env.get("TURNSTILE_SECRET_KEY");
  if(turnstileSecret){
    const responseToken=text(input,"turnstile_token",2048);if(!responseToken)return reply({error:"Güvenlik doğrulamasını tamamlayın."},400,origin);
    try{const verify=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:turnstileSecret,response:responseToken}),signal:AbortSignal.timeout(5000)});if(!(await verify.json()).success)return reply({error:"Güvenlik doğrulaması başarısız oldu."},400,origin)}catch{return reply({error:"Güvenlik doğrulaması kullanılamıyor."},503,origin)}
  }
  try{
    const day=new Date().toISOString().slice(0,10);
    const ip=request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||crypto.randomUUID();
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(day+":"+ip));
    const ipHash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
    const result=await fetch(PROJECT_URL+"/rest/v1/rpc/create_contact_lead",{method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json"},body:JSON.stringify({p_name:name,p_surname:surname,p_email:email,p_phone:phone,p_subject:subject,p_message:message,p_preference:preference,p_consent_at:new Date().toISOString(),p_ip_hash:ipHash}),signal:AbortSignal.timeout(7000)});
    if(result.status===429||result.status===409)return reply({error:"Kısa sürede çok fazla mesaj gönderildi."},429,origin);
    if(!result.ok){const error=await result.text();if(/rate limit exceeded/i.test(error))return reply({error:"Kısa sürede çok fazla mesaj gönderildi."},429,origin);return reply({error:"Mesaj şu anda iletilemedi."},503,origin)}
    await notify();return reply({ok:true},200,origin);
  }catch{return reply({error:"Mesaj şu anda iletilemedi. Daha sonra yeniden deneyin."},503,origin)}
});
