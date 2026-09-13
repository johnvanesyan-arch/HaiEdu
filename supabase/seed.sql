-- Structural seed only. Official Grade 7 Physics outcomes/topics/textbook sections are intentionally not invented here.

insert into public.grades (grade_number, label_hy, label_en)
values
  (1, '1-ին դասարան', 'Grade 1'),
  (2, '2-րդ դասարան', 'Grade 2'),
  (3, '3-րդ դասարան', 'Grade 3'),
  (4, '4-րդ դասարան', 'Grade 4'),
  (5, '5-րդ դասարան', 'Grade 5'),
  (6, '6-րդ դասարան', 'Grade 6'),
  (7, '7-րդ դասարան', 'Grade 7'),
  (8, '8-րդ դասարան', 'Grade 8'),
  (9, '9-րդ դասարան', 'Grade 9'),
  (10, '10-րդ դասարան', 'Grade 10'),
  (11, '11-րդ դասարան', 'Grade 11'),
  (12, '12-րդ դասարան', 'Grade 12')
on conflict (grade_number) do nothing;

insert into public.subjects (code, name_hy, name_en, status)
values ('physics', 'Ֆիզիկա', 'Physics', 'published')
on conflict (code) do nothing;
