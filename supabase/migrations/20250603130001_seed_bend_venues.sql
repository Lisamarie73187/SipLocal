-- 10 sample Bend, OR venues with happy hour slots and deals (fictionalized specials)
-- More venues: see 20250603150000_seed_bend_venues_more.sql

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

  -- 1. Deschutes Brewery Bend Public House
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, website_url, lat, lng, is_published
  ) values (
    v_city_id, 'deschutes-bend-public-house', 'Deschutes Brewery Bend Public House',
    'Iconic Bend brewery with Northwest pub fare and house beers on tap.',
    '1044 NW Bond St', '97703', '541-617-6800', 'https://www.deschutesbrewery.com',
    44.0572, -121.3145, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'deschutes-bend-public-house';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 1, '15:00', '18:00', 'Happy hour on pints and house wines', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House pints', '$4', 'drinks', 1),
    (v_slot_id, 'House wine', '$6', 'drinks', 2),
    (v_slot_id, 'Nachos', '$8', 'food', 3);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 2, '15:00', '18:00', 'Happy hour on pints and house wines', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House pints', '$4', 'drinks', 1),
    (v_slot_id, 'Slider trio', '$10', 'food', 2);

  -- 2. Crux Fermentation Project
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, website_url, lat, lng, is_published
  ) values (
    v_city_id, 'crux-fermentation-project', 'Crux Fermentation Project',
    'Award-winning brewery with wide patio and IPA-focused taps.',
    '50 SW Division St', '97702', '541-728-0279', 'https://www.cruxfermentation.com',
    44.0455, -121.3062, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'crux-fermentation-project';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 3, '16:00', '18:00', 'Midweek pint specials', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Crux pints', '$5', 'drinks', 1),
    (v_slot_id, 'Guest tap', '$6', 'drinks', 2);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 4, '16:00', '18:00', 'Midweek pint specials', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Crux pints', '$5', 'drinks', 1);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 5, '16:00', '19:00', 'Friday extended happy hour', array['drinks', 'food']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Pints', '$5', 'drinks', 1),
    (v_slot_id, 'Pretzel & beer cheese', '$9', 'food', 2);

  -- 3. Silver Lake Brewing — The Brew Hall
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, lat, lng, is_published
  ) values (
    v_city_id, 'silver-lake-brewing', 'Silver Lake Brewing — The Brew Hall',
    'Neighborhood brew hall on the east side with rotating taps.',
    '160 NW Gilchrist Ave', '97703', '541-728-1400',
    44.0589, -121.3154, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'silver-lake-brewing';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 1, '16:00', '18:00', 'Monday pint night', array['drinks']::public.deal_category[]),
    (v_venue_id, 2, '16:00', '18:00', 'Tuesday wine & beer', array['drinks']::public.deal_category[]),
    (v_venue_id, 3, '16:00', '18:00', 'Wednesday wings', array['both']::public.deal_category[]),
    (v_venue_id, 4, '16:00', '18:00', 'Thursday locals night', array['drinks']::public.deal_category[]),
    (v_venue_id, 5, '15:00', '18:00', 'Friday early happy hour', array['both']::public.deal_category[]);

  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 3 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Wings (8pc)', '$8', 'food', 1),
    (v_slot_id, 'Pitchers', '$12', 'drinks', 2);

  -- 4. Velvet Lounge
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'velvet-lounge', 'Velvet Lounge',
    'Downtown cocktail lounge with craft spirits and small plates.',
    '835 NW Brooks St', '97703',
    44.0583, -121.3150, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'velvet-lounge';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 2, '17:00', '19:00', 'Cocktail hour', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House cocktails', '$9', 'drinks', 1),
    (v_slot_id, 'Well wine', '$7', 'drinks', 2),
    (v_slot_id, 'Truffle fries', '$8', 'food', 3);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 4, '17:00', '19:00', 'Cocktail hour', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Old Fashioned', '$10', 'drinks', 1),
    (v_slot_id, 'Oysters (half dozen)', '$12', 'food', 2);

  -- 5. Zydeco Kitchen & Cocktails
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, lat, lng, is_published
  ) values (
    v_city_id, 'zydeco-kitchen', 'Zydeco Kitchen & Cocktails',
    'New Orleans-inspired kitchen with live music and strong happy hour.',
    '919 NW Bond St', '97703', '541-312-2891',
    44.0578, -121.3138, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'zydeco-kitchen';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 1, '16:00', '18:00', 'Bar bites & drink specials', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Zydeco mule', '$8', 'drinks', 1),
    (v_slot_id, 'Gumbo cup', '$6', 'food', 2),
    (v_slot_id, 'Po'' boy sliders (2)', '$9', 'food', 3);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 5, '15:00', '17:00', 'Early Friday happy hour', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Draft beer', '$4', 'drinks', 1),
    (v_slot_id, 'Jambalaya cup', '$7', 'food', 2);

  -- 6. Sidelines Sports Bar & Grill
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'sidelines-sports-bar', 'Sidelines Sports Bar & Grill',
    'Sports bar with big screens, pub food, and game-day crowds.',
    '224 SE College Way', '97702',
    44.0485, -121.3048, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'sidelines-sports-bar';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 0, '11:00', '14:00', 'Sunday game day specials', array['both']::public.deal_category[]),
    (v_venue_id, 1, '14:00', '18:00', 'Monday funday', array['both']::public.deal_category[]),
    (v_venue_id, 2, '14:00', '18:00', 'Tuesday taps', array['drinks']::public.deal_category[]),
    (v_venue_id, 3, '14:00', '18:00', 'Wing Wednesday', array['food']::public.deal_category[]);

  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 3 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Boneless wings (8)', '$7', 'food', 1),
    (v_slot_id, 'Domestic drafts', '$3.50', 'drinks', 2);

  -- 7. Brixx Craft Bar & Grill
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'brixx-craft-bar', 'Brixx Craft Bar & Grill',
    'Craft beer bar with pizzas and a sunny patio near the Old Mill.',
    '377 SW Century Dr', '97702',
    44.0428, -121.3225, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'brixx-craft-bar';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 1, '15:00', '18:00', 'Pizza & pint pairings', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, '10" margherita', '$10', 'food', 1),
    (v_slot_id, 'Craft pints', '$5', 'drinks', 2);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 4, '15:00', '18:00', 'Thirsty Thursday', array['drinks']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'All drafts', '$4.50', 'drinks', 1);

  -- 8. Spoken Moto Kitchen
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published, is_featured
  ) values (
    v_city_id, 'spoken-moto-kitchen', 'Spoken Moto Kitchen',
    'Coffee, tacos, and beer in a bike-culture hub on Scott St.',
    '915 SE Scott St', '97702',
    44.0468, -121.2985, true, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'spoken-moto-kitchen';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 5, '16:00', '18:00', 'Friday taco & beer', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Street tacos (2)', '$6', 'food', 1),
    (v_slot_id, 'Local cans', '$5', 'drinks', 2);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 6, '10:00', '12:00', 'Saturday brunch hour', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Bloody Mary', '$8', 'drinks', 1),
    (v_slot_id, 'Breakfast burrito', '$9', 'food', 2);

  -- 9. The Lot
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    lat, lng, is_published
  ) values (
    v_city_id, 'the-lot-bend', 'The Lot',
    'Food truck lot with covered seating and a central bar.',
    '344 SW Century Dr', '97702',
    44.0435, -121.3218, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'the-lot-bend';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values
    (v_venue_id, 2, '16:00', '18:00', 'Lot happy hour', array['drinks']::public.deal_category[]),
    (v_venue_id, 3, '16:00', '18:00', 'Lot happy hour', array['drinks']::public.deal_category[]),
    (v_venue_id, 4, '16:00', '18:00', 'Lot happy hour', array['drinks']::public.deal_category[]);

  select id into v_slot_id from public.happy_hour_slots
  where venue_id = v_venue_id and day_of_week = 2 limit 1;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House margarita', '$7', 'drinks', 1),
    (v_slot_id, 'Rotating lager', '$4', 'drinks', 2);

  -- 10. Bar Río
  insert into public.venues (
    city_id, slug, name, description, address_line1, postal_code,
    phone, lat, lng, is_published
  ) values (
    v_city_id, 'bar-rio', 'Bar Río',
    'Latin-inspired cocktails and tacos on the west side river district.',
    '1525 NW Wall St', '97703', '541-318-0001',
    44.0612, -121.3288, true
  ) on conflict (city_id, slug) do nothing
  returning id into v_venue_id;
  if v_venue_id is null then
    select id into v_venue_id from public.venues where city_id = v_city_id and slug = 'bar-rio';
  end if;

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 1, '16:00', '19:00', 'Siesta hour — tacos & tequila', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'House margarita', '$8', 'drinks', 1),
    (v_slot_id, 'Rio lager', '$5', 'drinks', 2),
    (v_slot_id, 'Carnitas tacos (2)', '$8', 'food', 3);

  insert into public.happy_hour_slots (venue_id, day_of_week, start_time, end_time, deal_summary, categories)
  values (v_venue_id, 3, '16:00', '19:00', 'Siesta hour — tacos & tequila', array['both']::public.deal_category[])
  returning id into v_slot_id;
  insert into public.happy_hour_deals (slot_id, label, price_text, category, sort_order) values
    (v_slot_id, 'Paloma', '$9', 'drinks', 1),
    (v_slot_id, 'Elote cup', '$6', 'food', 2);

end;
$$;
