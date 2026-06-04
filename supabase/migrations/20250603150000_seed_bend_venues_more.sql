-- Additional Bend, OR venues (fictionalized specials) — run after seed_bend_venues

do $$
declare
  v_city_id uuid;
  v_venue_id uuid;
  v_slot_id uuid;
begin
  select id into v_city_id from public.cities where slug = 'bend-or';
  if v_city_id is null then
    raise exception 'bend-or city not found — run seed_bend migration first';
  end if;

  -- 11. 10 Barrel Brewing — Bend
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, website_url, lat, lng, is_published
  ) values (
    v_city_id, 'ten-barrel-bend', '10 Barrel Brewing — Bend',
    'Downtown brewery pub with house beers, burgers, and a busy bar.',
    '1135 NW Galveston Ave', '97703', '541-585-1006', 'https://www.10barrel.com',
    44.0564, -121.3178, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'ten-barrel-bend';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 1, '15:00', '18:00', 'Monday pint & burger specials', array['both']::public.deal_category[]),
    (v_venue_id, 2, '15:00', '18:00', 'Tuesday tap takeover', array['drinks']::public.deal_category[]),
    (v_venue_id, 4, '15:00', '18:00', 'Thirsty Thursday', array['drinks']::public.deal_category[]);
  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 1 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House pints', '$4.50', 'drinks', 1),
    (v_slot_id, 'Burger & beer', '$12', 'food', 2);

  -- 12. Boss Rambler Beer Garden
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, lat, lng, is_published
  ) values (
    v_city_id, 'boss-rambler-beer-garden', 'Boss Rambler Beer Garden',
    'Open-air beer garden with fire pits, yard games, and local taps.',
    '65 SW Century Dr', '97702', '541-728-0600',
    44.0418, -121.3235, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'boss-rambler-beer-garden';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 3, '16:00', '18:00', 'Midweek garden hour', array['drinks']::public.deal_category[]),
    (v_venue_id, 5, '15:00', '18:00', 'Friday patio hour', array['both']::public.deal_category[]),
    (v_venue_id, 6, '12:00', '15:00', 'Saturday session beers', array['drinks']::public.deal_category[]);
  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 5 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Garden pints', '$5', 'drinks', 1),
    (v_slot_id, 'Pretzel bites', '$7', 'food', 2);

  -- 13. Astro Lounge
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'astro-lounge', 'Astro Lounge',
    'Neon-lit cocktail lounge with DJs and late-night small plates.',
    '939 NW Brooks St', '97703',
    44.0586, -121.3142, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'astro-lounge';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 4, '17:00', '19:00', 'Cosmic cocktail hour', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Signature cocktails', '$10', 'drinks', 1),
    (v_slot_id, 'Frozen cosmos', '$8', 'drinks', 2);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 5, '17:00', '20:00', 'Friday lounge hour', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Espresso martini', '$11', 'drinks', 1),
    (v_slot_id, 'Truffle popcorn', '$6', 'food', 2);

  -- 14. Hideout Tavern
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'hideout-tavern', 'Hideout Tavern',
    'Neighborhood tavern with pool tables, pub food, and local whiskey.',
    '198 NE Greenwood Ave', '97701',
    44.0625, -121.3012, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'hideout-tavern';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 0, '14:00', '17:00', 'Sunday football specials', array['both']::public.deal_category[]),
    (v_venue_id, 2, '15:00', '18:00', 'Taco Tuesday at the tavern', array['both']::public.deal_category[]),
    (v_venue_id, 3, '15:00', '18:00', 'Whiskey Wednesday', array['drinks']::public.deal_category[]);
  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 2 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Street tacos (3)', '$9', 'food', 1),
    (v_slot_id, 'Well drinks', '$5', 'drinks', 2);

  -- 15. Stihl Whiskey Bar
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, lat, lng, is_published
  ) values (
    v_city_id, 'stihl-whiskey-bar', 'Stihl Whiskey Bar',
    'Whiskey-forward bar with Pacific Northwest bites and a quiet patio.',
    '300 NW Franklin Ave', '97701', '541-728-2222',
    44.0601, -121.3125, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'stihl-whiskey-bar';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 1, '16:00', '18:00', 'Whiskey & wine hour', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Whiskey pours (1oz)', '$8', 'drinks', 1),
    (v_slot_id, 'Red wine', '$7', 'drinks', 2),
    (v_slot_id, 'Charcuterie board', '$14', 'food', 3);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 3, '16:00', '18:00', 'Midweek brown spirits', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Old Fashioned', '$9', 'drinks', 1),
    (v_slot_id, 'Bourbon flight', '$15', 'drinks', 2);

  -- 16. Pine Tavern
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, lat, lng, is_published
  ) values (
    v_city_id, 'pine-tavern', 'Pine Tavern',
    'Historic Bend restaurant and bar known for steaks and classic cocktails.',
    '967 NW Brooks St', '97703', '541-318-1101',
    44.0588, -121.3148, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'pine-tavern';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 1, '16:00', '18:00', 'Bar bites & wine', array['both']::public.deal_category[]),
    (v_venue_id, 4, '16:00', '18:00', 'Thursday lounge', array['drinks']::public.deal_category[]);
  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 1 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House wine', '$6', 'drinks', 1),
    (v_slot_id, 'Slider trio', '$11', 'food', 2);

  -- 17. Wild Card Brewing
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'wild-card-brewing', 'Wild Card Brewing',
    'Small-batch brewery taproom with rotating IPAs and food trucks.',
    '1555 NE Forbes Rd', '97701',
    44.0655, -121.2895, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'wild-card-brewing';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 2, '16:00', '18:00', 'Taproom Tuesday', array['drinks']::public.deal_category[]),
    (v_venue_id, 4, '16:00', '18:00', 'Thirsty Thursday cans', array['drinks']::public.deal_category[]),
    (v_venue_id, 5, '15:00', '18:00', 'Friday early birds', array['drinks']::public.deal_category[]);
  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 4 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Wild Card pints', '$5', 'drinks', 1),
    (v_slot_id, 'Crowlers to-go', '$10', 'drinks', 2);

  -- 18. Santé Restaurant & Bar
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, lat, lng, is_published
  ) values (
    v_city_id, 'sante-restaurant-bar', 'Santé Restaurant & Bar',
    'Wine bar and restaurant with Northwest plates and an extensive by-the-glass list.',
    '1010 NW Galveston Ave', '97703', '541-318-9000',
    44.0568, -121.3185, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'sante-restaurant-bar';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 2, '16:00', '18:00', 'Wine hour — glasses & bites', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House white or red', '$7', 'drinks', 1),
    (v_slot_id, 'Oysters (3)', '$9', 'food', 2),
    (v_slot_id, 'Cheese board', '$13', 'food', 3);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 5, '16:00', '18:00', 'Friday wine flight', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Flight of three', '$14', 'drinks', 1);

  -- 19. The Capitol Pub
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'capitol-pub', 'The Capitol Pub',
    'Classic Irish-style pub with darts, hearty fare, and Guinness on tap.',
    '1288 NW Galveston Ave', '97703',
    44.0559, -121.3192, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'capitol-pub';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 1, '14:00', '18:00', 'Monday pub hour', array['both']::public.deal_category[]),
    (v_venue_id, 3, '14:00', '18:00', 'Wednesday shepherd''s pie night', array['food']::public.deal_category[]),
    (v_venue_id, 5, '14:00', '18:00', 'Friday fish & chips', array['both']::public.deal_category[]);
  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 1 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Guinness pints', '$5', 'drinks', 1),
    (v_slot_id, 'Fish & chips', '$12', 'food', 2);

  -- 20. Riverhouse Rooftop Bar
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published, is_featured
  ) values (
    v_city_id, 'riverhouse-rooftop-bar', 'Riverhouse Rooftop Bar',
    'Rooftop bar with Deschutes views, spritzes, and sunset small plates.',
    '307 SW Columbia St', '97702',
    44.0442, -121.3110, true, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'riverhouse-rooftop-bar';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 4, '16:00', '19:00', 'Sunset spritz hour', array['drinks']::public.deal_category[]),
    (v_venue_id, 5, '15:00', '19:00', 'Friday rooftop hour', array['both']::public.deal_category[]),
    (v_venue_id, 6, '14:00', '17:00', 'Saturday golden hour', array['drinks']::public.deal_category[]);
  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 5 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Aperol spritz', '$9', 'drinks', 1),
    (v_slot_id, 'Rosé', '$8', 'drinks', 2),
    (v_slot_id, 'Flatbread', '$10', 'food', 3);

end;
$$;

-- Hero images for new venues
update public.venues
set image_url = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80'
where slug = 'ten-barrel-bend';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1572116469694-31de19f68b96?auto=format&fit=crop&w=800&q=80'
where slug = 'boss-rambler-beer-garden';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80'
where slug = 'astro-lounge';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1543007630-9710e4a00a04?auto=format&fit=crop&w=800&q=80'
where slug = 'hideout-tavern';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1527281400683-1aae237ff3e0?auto=format&fit=crop&w=800&q=80'
where slug = 'stihl-whiskey-bar';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80'
where slug = 'pine-tavern';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80'
where slug = 'wild-card-brewing';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1510815361-85bc64245964?auto=format&fit=crop&w=800&q=80'
where slug = 'sante-restaurant-bar';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50e?auto=format&fit=crop&w=800&q=80'
where slug = 'capitol-pub';

update public.venues
set image_url = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80'
where slug = 'riverhouse-rooftop-bar';
