-- Expose only section visibility metadata to anonymous visitors. Hidden section copy remains private.
begin;
drop function if exists public.get_homepage_visibility();
revoke select on table public.homepage_sections from anon;
revoke select on table public.homepage_sections from public;
grant select (section_key,is_visible) on table public.homepage_sections to anon;
drop policy if exists homepage_visibility_metadata on public.homepage_sections;
create policy homepage_visibility_metadata on public.homepage_sections
for select to anon using (true);
commit;
