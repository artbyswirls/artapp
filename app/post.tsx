import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Comment = {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
};

export default function PostScreen() {
  const { id, image_url, title, description, category, post_user_id } = useLocalSearchParams<{
    id: string;
    image_url: string;
    title: string;
    description: string;
    category: string;
    post_user_id: string;
  }>();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  async function fetchComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users(username, avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) console.log('Error fetching comments:', error);
    else {
      const commentsWithUser = (data || []).map((comment: any) => ({
        ...comment,
        username: comment.users?.username || 'Artist',
        avatar_url: comment.users?.avatar_url || null,
      }));
      setComments(commentsWithUser);
    }
  }

  async function handleComment() {
    if (!newComment.trim()) return;
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id: userId, text: newComment.trim() });

    if (error) Alert.alert('Error', error.message);
    else {
      setNewComment('');
      fetchComments();
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container}>

        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          {userId === post_user_id && (
            <TouchableOpacity onPress={() => router.push({ pathname: '/editpost', params: { id, image_url, title, description, category } })}>
              <Text style={styles.editText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <Image source={{ uri: image_url }} style={styles.image} />
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {category ? <Text style={styles.category}>#{category}</Text> : null}

        <Text style={styles.commentsHeader}>Comments ({comments.length})</Text>

        {comments.length === 0 ? (
          <Text style={styles.empty}>No comments yet. Be the first!</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/artist', params: { user_id: comment.user_id, username: comment.username } })}>
                <View style={styles.commentAvatar}>
                  {comment.avatar_url ? (
                    <Image source={{ uri: comment.avatar_url }} style={styles.commentAvatarImage} />
                  ) : (
                    <Text style={styles.commentAvatarEmoji}>👤</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/artist', params: { user_id: comment.user_id, username: comment.username } })}>
                    <Text style={styles.commentUsername}>@{comment.username}</Text>
                  </TouchableOpacity>
                  <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleComment}>
          <Text style={styles.sendText}>Post</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#9b59b6',
    fontWeight: '600',
  },
  editText: {
    fontSize: 16,
    color: '#9b59b6',
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    color: '#9b59b6',
    marginBottom: 16,
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
    color: '#333',
  },
  comment: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f953c6',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  commentAvatarEmoji: {
    fontSize: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9b59b6',
  },
  commentTime: {
    fontSize: 11,
    color: '#aaa',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  empty: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
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