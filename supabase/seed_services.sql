-- Handiwave service catalog seed data
-- Safe to rerun. Services are matched by unique slug.

insert into public.services (
  name,
  slug,
  category,
  description,
  icon,
  base_price,
  is_popular,
  is_active
)
values
  (
    'Electrician',
    'electrician',
    'Repairs',
    'Fix wiring, lighting, sockets, breakers, and electrical faults safely.',
    '⚡',
    7500,
    true,
    true
  ),
  (
    'Plumber',
    'plumber',
    'Repairs',
    'Repair leaks, taps, pipes, toilets, blocked drains, and water systems.',
    '🚰',
    6000,
    true,
    true
  ),
  (
    'Painter',
    'painter',
    'Home Care',
    'Refresh homes, offices, and shops with neat interior and exterior painting.',
    '🎨',
    25000,
    false,
    true
  ),
  (
    'Cleaner',
    'cleaner',
    'Home Care',
    'Book reliable cleaning for homes, apartments, offices, and shortlets.',
    '✨',
    12000,
    true,
    true
  ),
  (
    'Carpenter',
    'carpenter',
    'Installation',
    'Get furniture repairs, fittings, shelves, cabinets, doors, and woodwork.',
    '🪚',
    10000,
    false,
    true
  ),
  (
    'AC Repair',
    'ac-repair',
    'Installation',
    'Service, install, diagnose, and repair air conditioners quickly.',
    '❄️',
    8500,
    true,
    true
  ),
  (
    'Generator Repair',
    'generator-repair',
    'Repairs',
    'Service and repair petrol or diesel generators at your home or business.',
    '🔧',
    9000,
    true,
    true
  ),
  (
    'Appliance Repair',
    'appliance-repair',
    'Repairs',
    'Fix fridges, washing machines, cookers, microwaves, and other appliances.',
    '🔌',
    8000,
    false,
    true
  ),
  (
    'Mechanic',
    'mechanic',
    'Auto',
    'Book diagnostics, servicing, battery checks, and emergency auto support.',
    '🚗',
    10000,
    false,
    true
  ),
  (
    'Barber/Hair Stylist',
    'barber-hair-stylist',
    'Beauty',
    'Book grooming, haircuts, styling, braids, and home beauty appointments.',
    '💈',
    5000,
    true,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  icon = excluded.icon,
  base_price = excluded.base_price,
  is_popular = excluded.is_popular,
  is_active = excluded.is_active,
  updated_at = now();
