
-- Categories
create table if not exists public.kb_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  icon        text not null,
  color       text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Articles
create table if not exists public.kb_articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  summary       text not null,
  content_md    text not null,
  category_slug text not null references public.kb_categories(slug)
                  on update cascade on delete restrict,
  article_type  text not null default 'guide',
  tags          text[] not null default '{}',
  related_slugs text[] not null default '{}',
  view_count    int not null default 0,
  is_published  boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_kb_articles_category
  on public.kb_articles (category_slug, is_published);
create index if not exists idx_kb_articles_type
  on public.kb_articles (article_type);
create index if not exists idx_kb_articles_tags
  on public.kb_articles using gin (tags);
create index if not exists idx_kb_articles_fts
  on public.kb_articles
  using gin (to_tsvector('portuguese',
    coalesce(title,'') || ' ' ||
    coalesce(summary,'') || ' ' ||
    coalesce(content_md,'')
  ));

-- Feedback
create table if not exists public.kb_feedback (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.kb_articles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  is_helpful  boolean not null,
  comment     text,
  created_at  timestamptz not null default now(),
  unique (article_id, user_id)
);

-- View history
create table if not exists public.kb_article_views (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.kb_articles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  viewed_at  timestamptz not null default now()
);

create index if not exists idx_kb_views_user
  on public.kb_article_views (user_id, viewed_at desc);

-- AI queries log
create table if not exists public.kb_ai_queries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  query        text not null,
  ai_response  text not null,
  was_helpful  boolean,
  created_at   timestamptz not null default now()
);

-- RLS
alter table public.kb_categories enable row level security;
create policy "authenticated users can read categories"
  on public.kb_categories for select to authenticated
  using (true);

alter table public.kb_articles enable row level security;
create policy "authenticated users can read published articles"
  on public.kb_articles for select to authenticated
  using (is_published = true);

alter table public.kb_feedback enable row level security;
create policy "users can manage own feedback"
  on public.kb_feedback for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.kb_article_views enable row level security;
create policy "users can manage own views"
  on public.kb_article_views for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.kb_ai_queries enable row level security;
create policy "users can insert own queries"
  on public.kb_ai_queries for insert to authenticated
  with check (user_id = auth.uid());
create policy "users can read own queries"
  on public.kb_ai_queries for select to authenticated
  using (user_id = auth.uid());

-- Helper function
create or replace function public.increment_kb_article_views(p_article_id uuid)
returns void language sql security definer set search_path = public as $$
  update kb_articles set view_count = view_count + 1
  where id = p_article_id;
$$;
