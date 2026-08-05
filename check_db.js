import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  console.log('profiles:', { data, error })
  
  const { data: cards, error: cardsError } = await supabase.from('cards').select('*').limit(1)
  console.log('cards:', { data: cards, error: cardsError })
}
check()
