import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Conversation = {
  user_id: string;
  username: string;
  last_message: string;
  created_at: string;
};

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setCurrentUserId(session.user.id);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (error) console.log('Error fetching messages:', error);

    if (data) {
      const seen = new Set();
      const convos: Conversation[] = [];

      for (const msg of data) {
        const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
        if (seen.has(otherId)) continue;
        seen.add(otherId);

        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', otherId)
          .single();

        convos.push({
          user_id: otherId,
          username: userData?.username || 'Artist',
          last_message: msg.text,
          created_at: msg.created_at,
        });
      }
      setConversations(convos);
    }
    setLoading(false);
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#9b59b6" />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>💬 Messages</Text>

      {conversations.length === 0 ? (
        <Text style={styles.empty}>No messages yet. Visit an artist's profile to send a message!</Text>
      ) : (
        <ScrollView>
          {conversations.map((convo) => (
            <TouchableOpacity
              key={convo.user_id}
              style={styles.convoCard}
              onPress={() => router.push({ pathname: '/chat', params: { user_id: convo.user_id, username: convo.username } })}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
              <View style={styles.convoInfo}>
                <Text style={styles.username}>{convo.username}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{convo.last_message}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 20,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
    paddingHorizontal: 24,
  },
  convoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  convoInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
  },
});