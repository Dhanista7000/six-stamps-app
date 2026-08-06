import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('reward_codes')
    .select('code, status')
    .limit(10);
  
  if (error) {
    console.error('Error fetching codes:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No codes found in the database. You need to create an account and claim 6 stamps to generate a code!');
  } else {
    console.log('Found codes:');
    console.table(data);
  }
}

main();
