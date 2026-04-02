import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  seen: boolean;
};

export default function ChatScreen() {
  const { user_id, username } = useLocalSearchParams<{ user_id: string; username: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchMessages();
    fetchOtherUser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });
  }, []);

  async function fetchOtherUser() {
    const { data } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user_id)
      .single();
    if (data) setOtherAvatar(data.avatar_url);
  }

  async function fetchMessages() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${user_id}),and(sender_id.eq.${user_id},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true });

    if (error) console.log('Error fetching messages:', error);
    else {
      setMessages(data || []);
      markMessagesAsSeen(session.user.id, data || []);
    }

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function markMessagesAsSeen(myId: string, msgs: Message[]) {
    const unseenIds = msgs
      .filter(m => m.sender_id === user_id && m.receiver_id === myId && !m.seen)
      .map(m => m.id);

    if (unseenIds.length > 0) {
      await supabase
        .from('messages')
        .update({ seen: true })
        .in('id', unseenIds);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !currentUserId) return;

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: currentUserId, receiver_id: user_id, text: newMessage.trim(), seen: false })
      .select()
      .single();

    if (error) console.log('Send error:', error);
    else {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            {otherAvatar ? (
              <Image source={{ uri: otherAvatar }} style={styles.headerAvatarImage} />
            ) : (
              <Text style={styles.headerAvatarEmoji}>👤</Text>
            )}
          </View>
          <Text style={styles.headerUsername}>@{username}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>No messages yet. Say hello!</Text>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <View key={msg.id} style={[styles.messageRow, isMe && styles.messageRowMe]}>
                {!isMe && (
                  <View style={styles.avatar}>
                    {otherAvatar ? (
                      <Image source={{ uri: otherAvatar }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarEmoji}>👤</Text>
                    )}
                  </View>
                )}
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.bubbleText, isMe && styles.myBubbleText]}>{msg.text}</Text>
                  <View style={styles.messageFooter}>
                    <Text style={[styles.timeText, isMe && styles.myTimeText]}>{formatTime(msg.created_at)}</Text>
                    {isMe && (
                      <Text style={styles.seenText}>{msg.seen ? '✓✓' : '✓'}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backText: {
    fontSize: 16,
    color: '#9b59b6',
    fontWeight: '600',
    width: 60,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f953c6',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarEmoji: {
    fontSize: 18,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messages: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '72%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#9b59b6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: '#333',
  },
  myBubbleText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#aaa',
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  seenText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 40,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#9b59b6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
});