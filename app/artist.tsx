import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  user_id: string;
};

export default function ArtistScreen() {
  const { user_id, username } = useLocalSearchParams<{ user_id: string; username: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setCurrentUserId(session.user.id);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (postsData) setPosts(postsData);

    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user_id);

    setFollowerCount(count || 0);

    if (session?.user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', session.user.id)
        .eq('following_id', user_id)
        .single();

      setFollowing(!!followData);
    }

    setLoading(false);
  }

  async function handleFollow() {
    if (!currentUserId) return;

    if (following) {
      await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', user_id);
      setFollowing(false);
      setFollowerCount(prev => prev - 1);
    } else {
      await supabase.from('follows')
        .insert({ follower_id: currentUserId, following_id: user_id });
      setFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#9b59b6" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.username}>{username || 'Artist'}</Text>
        <Text style={styles.followerCount}>{followerCount} {followerCount === 1 ? 'follower' : 'followers'}</Text>

        {currentUserId !== user_id && (
          <TouchableOpacity
            style={[styles.followButton, following && styles.followingButton]}
            onPress={handleFollow}>
            <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.galleryHeader}>Gallery</Text>

      {posts.length === 0 ? (
        <Text style={styles.empty}>No posts yet!</Text>
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
  backButton: {
    marginTop: 60,
    marginLeft: 16,
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#9b59b6',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    padding: 24,
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
  followerCount: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  followButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#9b59b6',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  followingButtonText: {
    color: '#9b59b6',
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