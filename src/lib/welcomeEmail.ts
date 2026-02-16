import { supabase } from './supabase';

export async function sendWelcomeEmail(userId: string, email: string, displayName?: string) {
  try {
    const { data: alreadySent } = await supabase
      .from('welcome_emails_sent')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (alreadySent) {
      return { success: true, alreadySent: true };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiUrl = `${supabaseUrl}/functions/v1/send-welcome-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        email,
        display_name: displayName || email,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send welcome email');
    }

    const result = await response.json();

    await supabase
      .from('welcome_emails_sent')
      .insert({ user_id: userId });

    return { success: true, result };
  } catch (error) {
    return { success: false, error };
  }
}
