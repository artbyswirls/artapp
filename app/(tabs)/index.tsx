import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  user_id: string;
  username?: string;
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<{ [key: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      }
      fetchPosts();
    });
  }, []);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, users(username)')
      .order('created_at', { ascending: false });

    if (error) console.log('Error fetching posts:', error);
    else {
      const postsWithUsername = (data || []).map((post: any) => ({
        ...post,
        username: post.users?.username || 'Artist',
      }));
      setPosts(postsWithUsername);
      fetchLikes(postsWithUsername);
    }
    setLoading(false);
  }

  async function fetchLikes(posts: Post[]) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: userLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', session.user.id);

    const likedMap: { [key: string]: boolean } = {};
    userLikes?.forEach(like => {
      likedMap[like.post_id] = true;
    });
    setLikes(likedMap);

    const counts: { [key: string]: number } = {};
    for (const post of posts) {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      counts[post.id] = count || 0;
    }
    setLikeCounts(counts);
  }

  async function handleLike(postId: string) {
    if (!userId) {
      console.log('No user ID found');
      return;
    }

    if (likes[postId]) {
      const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: userId });
console.log('Like error:', error);

const { data: postData } = await supabase
  .from('posts')
  .select('user_id, title')
  .eq('id', postId)
  .single();

if (postData && postData.user_id !== userId) {
  const { data: userData } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', postData.user_id)
    .single();

  if (userData?.push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userData.push_token,
        title: '❤️ New Like!',
        body: `Someone liked your post "${postData.title}"`,
      }),
    });
  }
}
      setLikes(prev => ({ ...prev, [postId]: false }));
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 1) - 1 }));
    } else {
      const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: userId });
      console.log('Like error:', error);
      setLikes(prev => ({ ...prev, [postId]: true }));
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#9b59b6" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🎨 ArtApp</Text>
      {posts.length === 0 ? (
        <Text style={styles.empty}>No posts yet. Be the first to share your art!</Text>
      ) : (
        posts.map((post) => (
          <TouchableOpacity key={post.id} style={styles.card} onPress={() => router.push({ pathname: '/post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description } })}>
            <Image source={{ uri: post.image_url }} style={styles.image} />
            <TouchableOpacity onPress={() => router.push({ pathname: '/artist', params: { user_id: post.user_id, username: post.username || 'Artist' } })}>
  <Text style={styles.artistName}>@{post.username || 'Artist'}</Text>
</TouchableOpacity>
            <Text style={styles.artTitle}>{post.title}</Text>
            {post.description ? <Text style={styles.description}>{post.description}</Text> : null}
            <TouchableOpacity style={styles.likeButton} onPress={() => handleLike(post.id)}>
              <Text style={styles.likeText}>
                {likes[post.id] ? '❤️' : '🤍'} {likeCounts[post.id] || 0}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 10,
  },
  artTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  artistName: {
    fontSize: 14,
    color: '#9b59b6',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  likeButton: {
    marginTop: 10,
    padding: 8,
  },
  likeText: {
    fontSize: 18,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
});