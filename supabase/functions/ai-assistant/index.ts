const PROJECT_URL = Deno.env.get("SUPABASE_URL") || "";
const AUTH_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") || "";
const MODEL = "gemini-3.6-flash";
const TASKS = {
  outline:"Prepare a structured article outline with section headings and source checks.",
  summarize:"Summarize only the supplied material and retain uncertainty.",
  improve:"Improve clarity without changing legal meaning or adding unsupported claims.",
  seo:"Suggest an accurate title and concise description without keyword stuffing.",
  faq:"Draft useful questions only from the supplied verified material.",
  terms:"Suggest draft definitions for terms found in the supplied text.",
  simplify:"Rewrite the text in plain Turkish while preserving its meaning.",
  academic:"Improve academic structure without inventing citations or facts."
};
const headers = origin => ({
  "access-control-allow-origin":origin,
  "access-control-allow-headers":"authorization, apikey, x-client-info, content-type",
  "access-control-allow-methods":"POST, OPTIONS",
  "vary":"Origin"
});
const reply = (body,status=200,origin="null") => new Response(JSON.stringify(body),{
  status,headers:{...headers(origin),"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
async function adminId(token){
  if(!token||!PROJECT_URL||!AUTH_KEY)return "";
  const userResponse=await fetch(PROJECT_URL+"/auth/v1/user",{headers:{apikey:AUTH_KEY,authorization:"Bearer "+token},signal:AbortSignal.timeout(5000)});
  if(!userResponse.ok)return "";
  const user=await userResponse.json();
  if(!user.id)return "";
  const query=new URLSearchParams({select:"role",id:"eq."+user.id,limit:"1"});
  const profileResponse=await fetch(PROJECT_URL+"/rest/v1/profiles?"+query,{headers:{apikey:AUTH_KEY,authorization:"Bearer "+token},signal:AbortSignal.timeout(5000)});
  if(!profileResponse.ok)return "";
  const profiles=await profileResponse.json();
  return profiles.some(profile=>profile.role==="admin")?user.id:"";
}
Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(!SITE_ORIGIN||origin!==SITE_ORIGIN)return reply({error:"İstek doğrulanamadı."},403,origin||"null");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(request.method!=="POST")return reply({error:"Yalnızca POST desteklenir."},405,origin);
  const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  let actor="";
  try{actor=await adminId(token)}catch{return reply({error:"Oturum doğrulanamadı."},401,origin)}
  if(!actor)return reply({error:"Yalnızca yöneticiler kullanabilir."},401,origin);
  if(!SERVICE_KEY)return reply({error:"AI servisi yapılandırılmamış."},503,origin);
  try{
    const input=await request.json();
    const task=typeof input.task==="string"?input.task:"";
    const prompt=typeof input.prompt==="string"?input.prompt.trim().slice(0,12000):"";
    const sources=Array.isArray(input.sources)?input.sources.slice(0,20).map(value=>String(value).slice(0,500)):[];
    if(!TASKS[task]||prompt.length<10)return reply({error:"İstek bilgileri geçersiz."},400,origin);
    const dayStart=new Date();dayStart.setUTCHours(0,0,0,0);
    const usageParams=new URLSearchParams({select:"id",created_by:"eq."+actor,created_at:"gte."+dayStart.toISOString(),limit:"31"});
    const usageCheck=await fetch(PROJECT_URL+"/rest/v1/ai_generations?"+usageParams,{headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY},signal:AbortSignal.timeout(5000)});
    if(!usageCheck.ok)return reply({error:"AI kullanım sınırı denetlenemiyor."},503,origin);
    if((await usageCheck.json()).length>=30)return reply({error:"Günlük taslak sınırına ulaşıldı."},429,origin);
    const system=[
      "You are a careful Turkish legal research writing assistant. Produce an unpublished draft for review.",
      "Never invent statutes, decisions, docket numbers, quotations, sources, facts, qualifications or biography.",
      "Use only the material supplied. Mark missing verification as [KAYNAK DOĞRULANMALI].",
      "Do not provide case-specific advice. State uncertainty and do not publish.",
      "Task: "+TASKS[task],
      "User material:\n"+prompt,
      "User supplied sources (not independently verified):\n"+(sources.join("\n")||"None supplied."),
      "Return the draft in Turkish."
    ].join("\n\n");
    const apiKey=Deno.env.get("GEMINI_API_KEY");
    if(!apiKey)return reply({error:"AI servisi yapılandırılmamış."},503,origin);
    const generation=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+MODEL+":generateContent",{
      method:"POST",headers:{"content-type":"application/json","x-goog-api-key":apiKey},
      body:JSON.stringify({contents:[{role:"user",parts:[{text:system}]}],generationConfig:{temperature:0.25,maxOutputTokens:4096}}),
      signal:AbortSignal.timeout(45000)
    });
    if(!generation.ok)return reply({error:"AI servisi şu anda yanıt veremiyor."},502,origin);
    const result=await generation.json();
    const output=result?.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("").trim();
    if(!output)return reply({error:"AI taslağı oluşturulamadı."},502,origin);
    const save=await fetch(PROJECT_URL+"/rest/v1/ai_generations",{
      method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json",prefer:"return=representation"},
      body:JSON.stringify({created_by:actor,task,input:{prompt,sources},output,status:"draft",source_references:sources,model:MODEL}),
      signal:AbortSignal.timeout(7000)
    });
    if(!save.ok)return reply({error:"Taslak güvenli biçimde kaydedilemedi."},503,origin);
    const saved=await save.json(),usage=result?.usageMetadata||{};
    await fetch(PROJECT_URL+"/rest/v1/ai_usage",{
      method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json",prefer:"return=minimal"},
      body:JSON.stringify({actor_id:actor,provider:"Gemini",model:MODEL,task,input_tokens:usage.promptTokenCount??null,output_tokens:usage.candidatesTokenCount??null}),
      signal:AbortSignal.timeout(5000)
    }).catch(()=>{});
    return reply({success:true,draft_id:saved?.[0]?.id,text:output,status:"draft",model:MODEL},200,origin);
  }catch{return reply({error:"İstek tamamlanamadı. Daha sonra yeniden deneyin."},503,origin)}
});
