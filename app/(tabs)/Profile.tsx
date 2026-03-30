import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  category: string;
  user_id: string;
};

export default function ProfileScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const userId = session.user.id;

    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    if (userData) setUsername(userData.username);

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('Posts data:', postsData);
    console.log('Posts error:', postsError);
    console.log('User ID:', userId);

    if (postsData) {
      setPosts(postsData);
      setPostCount(postsData.length);
    }

    setLoading(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#9b59b6" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.username}>{username || 'Artist'}</Text>
        <Text style={styles.postCount}>{postCount} {postCount === 1 ? 'post' : 'posts'}</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.galleryHeader}>My Gallery</Text>

      {posts.length === 0 ? (
        <Text style={styles.empty}>You haven't posted any art yet!</Text>
      ) : (
        <View style={styles.grid}>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.gridItem}
              onPress={() => router.push({ pathname: '/post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description } })}>
              <Image source={{ uri: post.image_url }} style={styles.gridImage} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postCount: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#9b59b6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  signOutText: {
    color: '#9b59b6',
    fontWeight: '600',
  },
  galleryHeader: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  gridItem: {
    width: '33%',
    aspectRatio: 1,
    padding: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
});