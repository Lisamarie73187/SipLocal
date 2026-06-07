-- Expand event_type with more discovery categories
alter type public.event_type add value if not exists 'game_night';
alter type public.event_type add value if not exists 'comedy';
alter type public.event_type add value if not exists 'sports';
alter type public.event_type add value if not exists 'nightlife';
