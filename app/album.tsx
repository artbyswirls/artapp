import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
};

export default function AlbumScreen() {
  const { album_id, album_name } = useLocalSearchParams<{ album_id: string; album_name: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlbumPosts();
  }, []);

  async function fetchAlbumPosts() {
    const { data, error } = await supabase
      .from('album_posts')
      .select('post_id, posts(*)')
      .eq('album_id', album_id);

    if (error) console.log('Error:', error);
    else {
      const albumPosts = (data || []).map((item: any) => item.posts).filter(Boolean);
      setPosts(albumPosts);
    }
    setLoading(false);
  }

  async function handleDeleteAlbum() {
    Alert.alert('Delete Album', 'Are you sure you want to delete this album?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('albums').delete().eq('id', album_id);
          router.back();
        }
      }
    ]);
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
        <Text style={styles.headerText}>{album_name}</Text>
        <TouchableOpacity onPress={handleDeleteAlbum}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {posts.length === 0 ? (
          <Text style={styles.empty}>No posts in this album yet. Add posts from the feed!</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    width: 60,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    padding: 24,
  },
});