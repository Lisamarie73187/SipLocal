-- Re-parent venues incorrectly attached to San Diego whose address is actually Del Mar, CA
update public.venues
set city_id = (select id from public.cities where slug = 'del-mar-ca')
where id in (
  '709937c6-ac33-491a-9e11-e770e5bf794b', -- Salt + Lime
  '0cf24a13-b7cd-421e-8567-b4065f863e7b', -- Monarch Ocean Pub
  '35751f42-c7fc-460e-abc7-59f481311b4e', -- Beeside Balcony Del Mar
  '0d06ed5a-5f1b-4ad8-b77e-0d4e60b160ef', -- Sbicca Del Mar
  '5b9d4bc9-7f74-43a4-ab81-9691baf7d812', -- Tamarindo Del Mar
  '3a5ebc9b-ae04-497b-a7e2-d3c562383235', -- Il Fornaio Del Mar
  '9708fd06-6c2f-422a-92d3-f10be6ca7a62', -- Jake's Del Mar
  'd3e5ea33-fa54-452e-88ed-b6c105f13b26', -- Pacifica Del Mar
  '90fadb32-b301-4199-b731-950e36043a6f', -- Queenstown Del Mar
  'b1428ca8-3fa9-4bbd-8523-a68d12fd2deb', -- Shimbashi Izakaya
  '6309f2d9-e0d9-4a9d-b754-0e32446174cf', -- Aqua Mare Cucina Italiana & Cocktails
  'c53d09ea-bac2-47bb-8e50-e9f82de57935'  -- Adelaide Restaurant
)
and city_id = (select id from public.cities where slug = 'san-diego-ca');
