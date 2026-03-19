CREATE TABLE public.fund_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  fund_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fund_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on fund_cache"
  ON public.fund_cache FOR SELECT
  TO anon, authenticated
  USING (true);
