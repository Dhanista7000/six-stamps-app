CREATE OR REPLACE FUNCTION mint_reward(p_card_id UUID, p_reward_option_id UUID, p_redemption_code TEXT, p_expires_at TIMESTAMPTZ)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card cards;
  v_reward rewards;
BEGIN
  -- 1. Lock the card to prevent concurrent minting
  SELECT * INTO v_card FROM cards 
  WHERE id = p_card_id AND user_id = auth.uid()
  FOR UPDATE;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Card not found or unauthorized';
  END IF;

  -- 2. Verify state
  IF NOT v_card.is_completed THEN
    RAISE EXCEPTION 'Card is not completed';
  END IF;

  IF v_card.reward_claimed THEN
    RAISE EXCEPTION 'Reward already claimed';
  END IF;

  -- 3. Insert the reward
  INSERT INTO rewards (user_id, card_id, reward_option_id, redemption_code, expires_at)
  VALUES (auth.uid(), p_card_id, p_reward_option_id, p_redemption_code, p_expires_at)
  RETURNING * INTO v_reward;

  -- 4. Mark card as claimed
  UPDATE cards SET reward_claimed = TRUE WHERE id = p_card_id;

  RETURN row_to_json(v_reward);
END;
$$;
