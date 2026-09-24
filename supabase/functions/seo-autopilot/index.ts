const PROJECT_URL=Deno.env.get("SUPABASE_URL")||"";
const AUTH_KEY=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||"";
const CRON_SECRET=Deno.env.get("SEO_AUTOPILOT_SECRET")||"";
const json=(body,status=200,origin="null")=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":origin,"access-control-allow-headers":"authorization, apikey, content-type, x-autopilot-secret","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"}});
async function allowed(origin){
  if(!origin||!SERVICE_KEY)return false;
  const r=await fetch(PROJECT_URL+"/rest/v1/rpc/is_site_origin_allowed",{method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json"},body:JSON.stringify({p_origin:origin}),signal:AbortSignal.timeout(4000)});
  return r.ok&&await r.json()===true;
}
function matches(a,b){const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let d=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)d|=(x[i]||0)^(y[i]||0);return d===0}
async function admin(token){
  if(!token||!AUTH_KEY)return "";
  const u=await fetch(PROJECT_URL+"/auth/v1/user",{headers:{apikey:AUTH_KEY,authorization:"Bearer "+token},signal:AbortSignal.timeout(5000)});
  if(!u.ok)return "";const user=await u.json();if(!user.id)return "";
  const p=await fetch(PROJECT_URL+"/rest/v1/profiles?select=role&id=eq."+encodeURIComponent(user.id)+"&limit=1",{headers:{apikey:AUTH_KEY,authorization:"Bearer "+token},signal:AbortSignal.timeout(5000)});
  if(!p.ok)return "";const rows=await p.json();return rows.some(x=>x.role==="admin")?user.id:"";
}
Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(!PROJECT_URL||!AUTH_KEY||!SERVICE_KEY)return json({error:"SEO işlevi yapılandırılmadı."},503,origin||"null");
  if(origin&&!await allowed(origin))return json({error:"İstek doğrulanamadı."},403,origin);
  if(request.method==="OPTIONS")return origin?new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-headers":"authorization, apikey, content-type, x-autopilot-secret","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"}}):json({error:"İstek doğrulanamadı."},403,"null");
  if(request.method!=="POST")return json({error:"Yalnızca POST kabul edilir."},405,origin||"null");
  const provided=request.headers.get("x-autopilot-secret")||"",cron=!!CRON_SECRET&&matches(provided,CRON_SECRET);
  let actor="";
  if(!cron){try{actor=await admin((request.headers.get("authorization")||"").replace(/^Bearer\s+/i,""))}catch{}if(!actor)return json({error:"Yalnızca yöneticiler çalıştırabilir."},401,origin||"null")}
  let body;try{if(Number(request.headers.get("content-length")||0)>2000)return json({error:"İstek çok büyük."},413,origin||"null");body=await request.json()}catch{return json({error:"JSON gövdesi geçersiz."},400,origin||"null")}
  if(body.mode!=="audit-and-fix")return json({error:"Desteklenmeyen işlem."},400,origin||"null");
  try{
    const params=new URLSearchParams({select:"id,title,excerpt,content,seo_title,seo_description,canonical",status:"eq.published",deleted_at:"is.null",published_at:"lte."+new Date().toISOString(),is_demo:"eq.false",order:"updated_at.desc",limit:"250"});
    const response=await fetch(PROJECT_URL+"/rest/v1/articles?"+params,{headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY},signal:AbortSignal.timeout(8000)});
    if(!response.ok)return json({error:"Yayımlanmış yazılar okunamadı."},502,origin||"null");
    const articles=await response.json(),audits=[];let fixed=0;
    for(const a of articles){
      const title=String(a.seo_title||a.title||"").trim(),description=String(a.seo_description||a.excerpt||"").trim(),findings=[];let score=100;
      if(!title){findings.push({level:"error",message:"Başlık eksik."});score-=25}else if(title.length>60){findings.push({level:"suggestion",message:"Başlık uzunluğu gözden geçirilebilir."});score-=10}
      if(!description){findings.push({level:"error",message:"Arama açıklaması boş."});score-=25}else if(description.length<80||description.length>160){findings.push({level:"suggestion",message:"Açıklama uzunluğu gözden geçirilebilir."});score-=10}
      if(String(a.content||"").trim().length<500){findings.push({level:"suggestion",message:"Kapsam ve kaynaklar gözden geçirilebilir."});score-=15}
      if(!a.canonical)findings.push({level:"info",message:"Canonical adresi ayrıca tanımlı değil."});
      if(!findings.length)findings.push({level:"good",message:"Temel başlık ve açıklama denetimi tamamlandı."});
      audits.push({entity_type:"article",entity_id:a.id,score:Math.max(0,score),findings,audited_by:actor||null});
      const patch={};if(!String(a.seo_title||"").trim()&&title)patch.seo_title=title.slice(0,60);if(!String(a.seo_description||"").trim()&&description)patch.seo_description=description.slice(0,160);
      if(Object.keys(patch).length){const updated=await fetch(PROJECT_URL+"/rest/v1/articles?id=eq."+encodeURIComponent(a.id),{method:"PATCH",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(patch),signal:AbortSignal.timeout(8000)});if(!updated.ok)return json({error:"SEO alanları kaydedilemedi.",fixed},502,origin||"null");fixed++}
    }
    if(audits.length){const saved=await fetch(PROJECT_URL+"/rest/v1/seo_audits",{method:"POST",headers:{apikey:SERVICE_KEY,authorization:"Bearer "+SERVICE_KEY,"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(audits),signal:AbortSignal.timeout(8000)});if(!saved.ok)return json({error:"SEO raporu kaydedilemedi.",fixed},502,origin||"null")}
    return json({ok:true,scanned:articles.length,fixed,audited:audits.length,message:"Gerçek yayımlanmış yazılar tarandı. Boş alanlar yalnızca mevcut içerikten tamamlandı."},200,origin||"null");
  }catch{return json({error:"SEO denetimi tamamlanamadı."},500,origin||"null")}
});
