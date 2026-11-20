-- Global, farm-owned-independent configuration (farm_id IS NULL).
-- These rows are read-only to non-service roles via RLS; farms override by
-- inserting a farm-scoped copy with the same immutable code.

-- NOTE: the spec listed `other` for both income and expense transaction
-- categories. The (farm_id, entity, code) uniqueness rule cannot hold two
-- global rows with the same code, so they are seeded as expense_other and
-- income_other. The displayed name_bn is "অন্যান্য" for both.

insert into public.categories (
  farm_id, entity, code, name, name_bn, icon, color, sort_order, is_active, is_global
)
select
  null, v.entity, v.code, v.name, v.name_bn, v.icon, v.color, v.sort_order, true, true
from (values
  ('animal', 'cow',             'Cow',            'গরু',          '🐄', '#8B5E3C', 1),
  ('animal', 'goat',            'Goat',           'ছাগল',         '🐐', '#A67C52', 2),
  ('animal', 'chicken',         'Chicken',        'মুরগি',        '🐔', '#E8821E', 3),
  ('animal', 'duck',            'Duck',           'হাঁস',         '🦆', '#6C8EA4', 4),
  ('animal', 'fish',            'Fish',           'মাছ',          '🐟', '#3E8E9E', 5),
  ('animal', 'buffalo',         'Buffalo',        'মহিষ',         '🐃', '#6B5B45', 6),
  ('animal', 'pigeon',          'Pigeon',         'কবুতর',        '🕊️', '#8892A0', 7),
  ('animal', 'other',           'Other animal',   'অন্যান্য',      '🐾', '#9CA3AF', 8),

  ('transaction', 'feed',            'Feed',            'খাবার',          '🌾', '#C79A3B', 1),
  ('transaction', 'medicine',        'Medicine',        'ঔষধ',           '💊', '#C0392B', 2),
  ('transaction', 'labor',           'Labor',           'শ্রমিক',         '🧑‍🌾', '#7B6F5B', 3),
  ('transaction', 'transport',       'Transport',       'পরিবহন',        '🚚', '#5B7C99', 4),
  ('transaction', 'vet',             'Vet',             'পশু চিকিৎসক',    '🩺', '#2E7D32', 5),
  ('transaction', 'equipment',       'Equipment',       'যন্ত্রপাতি',      '🛠️', '#6B7280', 6),
  ('transaction', 'animal_purchase', 'Animal purchase', 'পশু ক্রয়',       '🐄', '#8B5E3C', 7),
  ('transaction', 'utility',         'Utility',         'বিদ্যুৎ/পানি',     '💡', '#F9A825', 8),
  ('transaction', 'expense_other',   'Other expense',   'অন্যান্য',        '📦', '#9CA3AF', 9),

  ('transaction', 'animal_sale', 'Animal sale', 'পশু বিক্রি', '💰', '#1B7F4B', 20),
  ('transaction', 'milk',        'Milk',        'দুধ',        '🥛', '#7BA7C7', 21),
  ('transaction', 'egg',         'Egg',         'ডিম',        '🥚', '#E8C36A', 22),
  ('transaction', 'meat',        'Meat',        'মাংস',       '🍖', '#B0533C', 23),
  ('transaction', 'manure',      'Manure',      'গোবর/সার',    '🌱', '#4E7A3A', 24),
  ('transaction', 'income_other','Other income','অন্যান্য',    '📥', '#9CA3AF', 25)
) as v(entity, code, name, name_bn, icon, color, sort_order)
where not exists (
  select 1
  from public.categories c
  where c.farm_id is null
    and c.entity = v.entity
    and c.code = v.code
);

insert into public.field_definitions (
  farm_id, entity, key, label, label_bn, type, options, required,
  default_value, sort_order, show_in_list, show_in_form, is_active
)
select
  null, v.entity, v.key, v.label, v.label_bn, v.type,
  v.options::jsonb, v.required, null, v.sort_order,
  v.show_in_list, true, true
from (values
  ('animal',     'breed',      'Breed',       'জাত',           'text',   '[]', false, 1, false),
  ('animal',     'weight_kg',  'Weight (kg)', 'ওজন কেজি',       'number', '[]', false, 2, true),
  ('transaction','invoice_no', 'Invoice no.', 'ইনভয়েস নম্বর',   'text',   '[]', false, 1, false),
  ('transaction','shop_name',  'Shop name',   'দোকানের নাম',     'text',   '[]', false, 2, false)
) as v(entity, key, label, label_bn, type, options, required, sort_order, show_in_list)
where not exists (
  select 1
  from public.field_definitions fd
  where fd.farm_id is null
    and fd.entity = v.entity
    and fd.key = v.key
);
