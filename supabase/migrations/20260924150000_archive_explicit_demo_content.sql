-- Archive only the rows explicitly tagged as demo content.
-- A private JSON backup was created before this change. Setting deleted_at is reversible.
update public.articles set deleted_at = now() where is_demo is true and deleted_at is null;
update public.caselaw set deleted_at = now() where is_demo is true and deleted_at is null;
update public.glossary_terms set deleted_at = now() where is_demo is true and deleted_at is null;
update public.faq set deleted_at = now() where is_demo is true and deleted_at is null;
