// ==============================================
// notificationService.js
// This file handles all notification functions
// ==============================================

import { supabase } from './supabase';

// ---- Get all notifications for a user ----
export async function fetchNotifications(userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error:', err.message);
    return [];
  }
}

// ---- Get unread count (number on the badge) ----
export async function fetchUnreadCount(userId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  } catch (err) {
    return 0;
  }
}

// ---- Mark ONE notification as read ----
export async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    return !error;
  } catch (err) {
    return false;
  }
}

// ---- Mark ALL as read ----
export async function markAllAsRead(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    return !error;
  } catch (err) {
    return false;
  }
}

// ---- Delete a notification ----
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    return !error;
  } catch (err) {
    return false;
  }
}

// ---- Create a new notification ----
export async function createNotification({ recipientId, senderId, type, postId = null, message }) {
  // Don't notify yourself
  if (recipientId === senderId) return null;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          recipient_id: recipientId,
          sender_id: senderId,
          type: type, // 'like', 'comment', or 'follow'
          post_id: postId,
          message: message,
          is_read: false,
        },
      ])
      .select();

    if (error) {
      console.error('Error creating notification:', error.message);
      return null;
    }
    return data[0];
  } catch (err) {
    return null;
  }
}

// ---- Listen for new notifications in real-time ----
export function subscribeToNotifications(userId, onNewNotification) {
  const channel = supabase
    .channel('user-notifications-' + userId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'recipient_id=eq.' + userId,
      },
      (payload) => {
        onNewNotification(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}