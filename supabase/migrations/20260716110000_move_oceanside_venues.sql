-- Re-parent venues incorrectly attached to San Diego whose address is actually Oceanside, CA
update public.venues
set city_id = (select id from public.cities where slug = 'oceanside-ca')
where id in (
  '34c1f52b-e0d8-4e25-8000-52219b805d13', -- Masters Kitchen and Cocktail
  '61d55c0a-c395-446a-807b-c29e098794c1', -- Mission Ave Bar and Grill
  '234bc620-a36a-452b-8b29-21d7934c4d35', -- Oceanside Broiler
  'b9a563a5-5b4e-4abb-a401-9b2119c98860', -- allmine
  '152df95c-c1c1-4309-8ab2-5543e6c53f30', -- Fat Joe's O'side
  '8f35bd59-e893-4a17-b404-193f65a72660', -- The Privateer Coal Fire Pizza
  '1cdc8443-f3ce-4bcf-ad67-251ac1f94bd5', -- Lighthouse Oyster Bar & Grill
  'dc850560-2b44-4dea-830c-ec798337cc59'  -- 333 Pacific
)
and city_id = (select id from public.cities where slug = 'san-diego-ca');
