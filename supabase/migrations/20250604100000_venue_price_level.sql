-- Venue price tier ($ / $$ / $$$) for filters and cards
create type public.venue_price_level as enum ('$', '$$', '$$$');

alter table public.venues
  add column price_level public.venue_price_level not null default '$';

comment on column public.venues.price_level is 'Typical spend per person for this venue';

-- Bend seed venues (original 10)
update public.venues set price_level = '$' where slug = 'silver-lake-brewing';
update public.venues set price_level = '$' where slug = 'sidelines-sports-bar';
update public.venues set price_level = '$$' where slug = 'deschutes-bend-public-house';
update public.venues set price_level = '$$' where slug = 'crux-fermentation-project';
update public.venues set price_level = '$$' where slug = 'brixx-craft-bar';
update public.venues set price_level = '$$' where slug = 'the-lot-bend';
update public.venues set price_level = '$$' where slug = 'bar-rio';
update public.venues set price_level = '$$$' where slug = 'velvet-lounge';
update public.venues set price_level = '$$$' where slug = 'zydeco-kitchen';
update public.venues set price_level = '$$$' where slug = 'spoken-moto-kitchen';

-- Bend seed venues (additional 10)
update public.venues set price_level = '$' where slug = 'boss-rambler-beer-garden';
update public.venues set price_level = '$' where slug = 'astro-lounge';
update public.venues set price_level = '$' where slug = 'hideout-tavern';
update public.venues set price_level = '$' where slug = 'wild-card-brewing';
update public.venues set price_level = '$' where slug = 'capitol-pub';
update public.venues set price_level = '$$' where slug = 'ten-barrel-bend';
update public.venues set price_level = '$$$' where slug = 'stihl-whiskey-bar';
update public.venues set price_level = '$$$' where slug = 'pine-tavern';
update public.venues set price_level = '$$$' where slug = 'sante-restaurant-bar';
update public.venues set price_level = '$$$' where slug = 'riverhouse-rooftop-bar';
