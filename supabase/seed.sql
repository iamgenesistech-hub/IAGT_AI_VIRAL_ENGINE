insert into public.viral_ads (
  id, platform, category, title, hook, views, engagement, velocity, conversion, cta, tags, product_match, emotion, structure
)
values
  (
    'ad-001',
    'TikTok',
    'Weight loss',
    '7-day reset testimonial',
    'Nobody talks about this morning habit...',
    2400000,
    12.8,
    92,
    84,
    'Start your reset today',
    '["before-after","voiceover","fast cuts","testimonial"]'::jsonb,
    'Sea Moss + Metabolic Support',
    'Relief, curiosity, self-belief',
    '["Hook","Problem","Personal proof","Product ritual","CTA"]'::jsonb
  ),
  (
    'ad-002',
    'Instagram',
    'Beauty',
    'Glow ritual demo',
    'This is the glow routine nobody showed me soon enough.',
    1700000,
    9.6,
    86,
    78,
    'Shop the glow ritual',
    '["routine","lifestyle","product-demo"]'::jsonb,
    'Collagen + Sea Moss',
    'Confidence, aspiration',
    '["Hook","Routine","Product","Close-up","CTA"]'::jsonb
  )
on conflict (id) do update set
  platform = excluded.platform,
  category = excluded.category,
  title = excluded.title,
  hook = excluded.hook,
  views = excluded.views,
  engagement = excluded.engagement,
  velocity = excluded.velocity,
  conversion = excluded.conversion,
  cta = excluded.cta,
  tags = excluded.tags,
  product_match = excluded.product_match,
  emotion = excluded.emotion,
  structure = excluded.structure;

insert into public.workflow_steps (id, step_time, title, description, sort_order)
values
  ('wf-001', '6:00 AM', 'Scrape viral content', 'TikTok, Reels, Shorts, Ads Library, Pinterest, X', 10),
  ('wf-002', '6:30 AM', 'Analyze winning structures', 'Hooks, pacing, CTAs, visual patterns, emotional tags', 20),
  ('wf-003', '7:00 AM', 'Match products', 'Connect trends to the configured brand products and offers', 30),
  ('wf-004', '7:30 AM', 'Generate new ads', 'Scripts, videos, captions, thumbnails, A/B versions', 40),
  ('wf-005', '8:00 AM', 'Quality review', 'Optional human approval before publishing', 50),
  ('wf-006', 'Nightly', 'Learning loop', 'Update best hooks, products, channels, and formats', 60)
on conflict (id) do update set
  step_time = excluded.step_time,
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;
