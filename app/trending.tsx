import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');

type TrendingPost = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  category: string;
  user_id: string;
  username?: string;
  like_count: number;
};

export default function TrendingScreen() {
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, []);

  async function fetchTrending() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: likesData, error } = await supabase
      .from('likes')
      .select('post_id')
      .gte('created_at', oneWeekAgo.toISOString());

    if (error) { console.log('Error:', error); setLoading(false); return; }

    const countMap: { [key: string]: number } = {};
    likesData?.forEach(like => {
      countMap[like.post_id] = (countMap[like.post_id] || 0) + 1;
    });

    const sortedPostIds = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);

    if (sortedPostIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: postsData } = await supabase
      .from('posts')
      .select('*, users(username)')
      .in('id', sortedPostIds);

    if (postsData) {
      const ranked = sortedPostIds
        .map(id => {
          const post = postsData.find(p => p.id === id);
          if (!post) return null;
          return {
            ...post,
            username: post.users?.username || 'Artist',
            like_count: countMap[id],
          };
        })
        .filter(Boolean) as TrendingPost[];
      setPosts(ranked);
    }

    setLoading(false);
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#f953c6" />
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f953c6', '#b91d73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>🔥 Trending</Text>
        <View style={{ width: 60 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Most liked this week</Text>

        {posts.length === 0 ? (
          <Text style={styles.empty}>No trending posts yet — start liking some art!</Text>
        ) : (
          posts.map((post, index) => (
            <TouchableOpacity
              key={post.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description, category: post.category, post_user_id: post.user_id } })}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </Text>
              </View>
              <Image source={{ uri: post.image_url }} style={styles.image} />
              <View style={styles.cardInfo}>
                <Text style={styles.title} numberOfLines={1}>{post.title}</Text>
                <Text style={styles.artist}>@{post.username}</Text>
                <View style={styles.likeRow}>
                  <Text style={styles.likeCount}>❤️ {post.like_count} likes this week</Text>
                </View>
                {post.category ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>#{post.category}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    width: 60,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  rank: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  rankText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  image: {
    width: 90,
    height: 90,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  artist: {
    fontSize: 13,
    color: '#b91d73',
    marginBottom: 4,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  likeCount: {
    fontSize: 13,
    color: '#888',
  },
  categoryBadge: {
    backgroundColor: '#f0e6ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    color: '#8e54e9',
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
    padding: 24,
  },
});