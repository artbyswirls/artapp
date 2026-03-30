import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  category: string;
  user_id: string;
  username?: string;
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<{ [key: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
      fetchPosts();
    });
  }, []);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, users(username)')
      .order('created_at', { ascending: false });

    if (error) console.log('Error:', error);
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
    userLikes?.forEach(like => { likedMap[like.post_id] = true; });
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
    if (!userId) return;
    if (likes[postId]) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
      setLikes(prev => ({ ...prev, [postId]: false }));
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 1) - 1 }));
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId });
      setLikes(prev => ({ ...prev, [postId]: true }));
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }
  }

  function handleSwipeUp(post: Post) {
    setSelectedPost(post);
    bottomSheetRef.current?.expand();
  }

  const renderPost = ({ item: post }: { item: Post }) => {
    let lastTap = 0;

    const pan = PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -10,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -50) handleSwipeUp(post);
      },
    });

    function handleDoubleTap() {
      const now = Date.now();
      if (now - lastTap < 300) {
        handleLike(post.id);
      }
      lastTap = now;
    }

    return (
      <TouchableOpacity activeOpacity={1} style={styles.slide} {...pan.panHandlers} onPress={handleDoubleTap}>
        <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.overlay}>
          <TouchableOpacity
            style={styles.artistRow}
            onPress={() => router.push({ pathname: '/artist', params: { user_id: post.user_id, username: post.username } })}>
            <Text style={styles.artistName}>👤 @{post.username}</Text>
          </TouchableOpacity>
          <Text style={styles.artTitle}>{post.title}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(post.id)}>
              <Text style={styles.actionText}>{likes[post.id] ? '❤️' : '🤍'} {likeCounts[post.id] || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push({ pathname: '/post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description } })}>
              <Text style={styles.actionText}>💬 Comment</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.swipeHint}>↑ Swipe up for details</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#f953c6" />
    </View>
  );

  if (posts.length === 0) return (
    <View style={styles.centered}>
      <Text style={styles.empty}>No posts yet. Be the first to share your art!</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        colors={['#f953c6', '#b91d73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}>
        <Text style={styles.headerText}>🎨 ArtApp</Text>
        <Text style={styles.counter}>{currentIndex + 1} / {posts.length}</Text>
      </LinearGradient>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['50%', '80%']}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBg}
        handleIndicatorStyle={styles.indicator}>
        <BottomSheetView style={styles.bottomSheetContent}>
          {selectedPost && (
            <>
              <Text style={styles.sheetTitle}>{selectedPost.title}</Text>
              {selectedPost.category ? (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>#{selectedPost.category}</Text>
                </View>
              ) : null}
              {selectedPost.description ? (
                <>
                  <Text style={styles.sheetLabel}>Description</Text>
                  <Text style={styles.sheetDescription}>{selectedPost.description}</Text>
                </>
              ) : (
                <Text style={styles.noDescription}>No description provided.</Text>
              )}
              <TouchableOpacity
                style={styles.viewPostButton}
                onPress={() => {
                  bottomSheetRef.current?.close();
                  router.push({ pathname: '/post', params: { id: selectedPost.id, image_url: selectedPost.image_url, title: selectedPost.title, description: selectedPost.description } });
                }}>
                <LinearGradient
                  colors={['#f953c6', '#b91d73']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.viewPostGradient}>
                  <Text style={styles.viewPostText}>View Full Post & Comments</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  counter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  slide: {
    width,
    flex: 1,
  },
  image: {
    width,
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  artistRow: {
    marginBottom: 8,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  artTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 18,
    color: '#fff',
  },
  swipeHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    padding: 24,
  },
  bottomSheetBg: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: {
    backgroundColor: '#ddd',
    width: 40,
  },
  bottomSheetContent: {
    padding: 24,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#f0e6ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryBadgeText: {
    color: '#8e54e9',
    fontSize: 14,
    fontWeight: '600',
  },
  sheetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sheetDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 24,
  },
  noDescription: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 24,
  },
  viewPostButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewPostGradient: {
    padding: 16,
    alignItems: 'center',
  },
  viewPostText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});