-- Public read access for published structural curriculum/item content.
create policy "subjects_public_read_published" on public.subjects for select to anon using (status = 'published');
create policy "grades_public_read" on public.grades for select to anon using (true);
create policy "skills_public_read_published" on public.skills for select to anon using (status = 'published');
create policy "items_public_read_published" on public.items for select to anon using (status = 'published');
create policy "item_options_public_read" on public.item_options for select to anon using (true);
