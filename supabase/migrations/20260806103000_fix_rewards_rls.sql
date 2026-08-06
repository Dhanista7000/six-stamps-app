CREATE POLICY "Users can insert own rewards" ON public.rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
