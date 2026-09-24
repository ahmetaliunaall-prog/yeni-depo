-- Additive setup: preserve accounts, content, credentials and existing Edge Functions.
begin;
alter table public.site_settings add column if not exists theme_config jsonb not null default '{"palette":"forest","layout":"editorial"}'::jsonb;
alter table public.site_settings add column if not exists footer_notice text not null default 'Bu site kişisel niteliktedir. İçerikler genel bilgilendirme amacı taşır; hukuki görüş veya danışmanlık yerine geçmez.';
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('site-media','site-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists site_media_public_read on storage.objects;
create policy site_media_public_read on storage.objects for select to anon,authenticated using (bucket_id='site-media');
drop policy if exists site_media_admin_insert on storage.objects;
create policy site_media_admin_insert on storage.objects for insert to authenticated with check (bucket_id='site-media' and (select private.is_admin()));
drop policy if exists site_media_admin_update on storage.objects;
create policy site_media_admin_update on storage.objects for update to authenticated using (bucket_id='site-media' and (select private.is_admin())) with check (bucket_id='site-media' and (select private.is_admin()));
drop policy if exists site_media_admin_delete on storage.objects;
create policy site_media_admin_delete on storage.objects for delete to authenticated using (bucket_id='site-media' and (select private.is_admin()));
drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles for select to anon,authenticated using (status='published' and published_at<=now() and deleted_at is null and is_demo is not true);
drop policy if exists caselaw_public_read on public.caselaw;
create policy caselaw_public_read on public.caselaw for select to anon,authenticated using (status='published' and deleted_at is null and is_demo is not true);
drop policy if exists glossary_public_read on public.glossary_terms;
create policy glossary_public_read on public.glossary_terms for select to anon,authenticated using (status='published' and deleted_at is null and is_demo is not true);
drop policy if exists faq_public_read on public.faq;
create policy faq_public_read on public.faq for select to anon,authenticated using (published is true and status='published' and deleted_at is null and is_demo is not true);
drop policy if exists categories_public_read on public.article_categories;
create policy categories_public_read on public.article_categories for select to anon,authenticated using (exists (select 1 from public.articles a where a.category_id=article_categories.id and a.status='published' and a.published_at<=now() and a.deleted_at is null and a.is_demo is not true));
drop policy if exists article_tags_public_read on public.article_tags;
create policy article_tags_public_read on public.article_tags for select to anon,authenticated using (exists (select 1 from public.article_tag_relations r join public.articles a on a.id=r.article_id where r.tag_id=article_tags.id and a.status='published' and a.published_at<=now() and a.deleted_at is null and a.is_demo is not true));
drop policy if exists article_tag_relations_public_read on public.article_tag_relations;
create policy article_tag_relations_public_read on public.article_tag_relations for select to anon,authenticated using (exists (select 1 from public.articles a where a.id=article_tag_relations.article_id and a.status='published' and a.published_at<=now() and a.deleted_at is null and a.is_demo is not true));
create or replace function public.get_homepage_visibility() returns table(section_key text,is_visible boolean) language sql stable security definer set search_path = '' as $visibility$ select h.section_key,h.is_visible from public.homepage_sections h $visibility$;
revoke all on function public.get_homepage_visibility() from public;
grant execute on function public.get_homepage_visibility() to anon,authenticated;
commit;
