import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
};

export default function ChatScreen() {
  const { user_id, username } = useLocalSearchParams<{ user_id: string; username: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });
  }, []);

  async function fetchMessages() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${user_id}),and(sender_id.eq.${user_id},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true });

    if (error) console.log('Error fetching messages:', error);
    else setMessages(data || []);
  }

  async function handleSend() {
    if (!newMessage.trim() || !currentUserId) return;

    const { error } = await supabase
      .from('messages')
      .insert({ sender_id: currentUserId, receiver_id: user_id, text: newMessage.trim() });

    if (error) console.log('Send error:', error);
    else {
      setNewMessage('');
      fetchMessages();
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerUsername}>{username}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.messages} contentContainerStyle={{ padding: 16 }}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>No messages yet. Say hello!</Text>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.sender_id === currentUserId ? styles.myBubble : styles.theirBubble]}>
              <Text style={[styles.bubbleText, msg.sender_id === currentUserId && styles.myBubbleText]}>
                {msg.text}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
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
  headerUsername: {
    fontSize: 18,
    fontWeight: 'bold',
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
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#9b59b6',
    alignSelf: 'flex-end',
  },
  theirBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 15,
    color: '#333',
  },
  myBubbleText: {
    color: '#fff',
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