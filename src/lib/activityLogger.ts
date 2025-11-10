import { supabase } from './supabase';

export async function logUserActivity(
  userId: string,
  action: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_user_activity', {
      p_user_id: userId,
      p_action: action,
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || navigator.userAgent,
    });

    if (error) {
      console.error('Failed to log user activity:', error);
    }
  } catch (err) {
    console.error('Error logging user activity:', err);
  }
}

export const ActivityActions = {
  SIGN_UP: 'User signed up',
  SIGN_IN: 'User signed in',
  SIGN_OUT: 'User signed out',
  EMAIL_VERIFIED: 'User verified email address',
  PASSWORD_CHANGED: 'User changed password',
  PASSWORD_RESET_REQUESTED: 'User requested password reset',
  PASSWORD_RESET_COMPLETED: 'User completed password reset',
  EMAIL_CHANGE_REQUESTED: 'User requested email change',
  EMAIL_CHANGED: 'User changed email address',
  PROFILE_UPDATED: 'User updated profile',
  NOTE_CREATED: 'User created a note',
  NOTE_UPDATED: 'User updated a note',
  NOTE_DELETED: 'User deleted a note',
} as const;
