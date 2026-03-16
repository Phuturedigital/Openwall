const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function deleteAllUsers() {
  console.log('Calling delete-all-users function...');

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-all-users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  console.log('\nResult:', JSON.stringify(result, null, 2));
}

deleteAllUsers().catch(console.error);
