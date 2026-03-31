import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Album = {
  id: string;
  name: string;
};

export default function AddToAlbumScreen() {
  const { post_id } = useLocalSearchParams<{ post_id: string }>();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  async function fetchAlbums() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setUserId(session.user.id);

    const { data } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    setAlbums(data || []);
    setLoading(false);
  }

  async function handleAddToAlbum(albumId: string, albumName: string) {
    const { error } = await supabase
      .from('album_posts')
      .insert({ album_id: albumId, post_id });

    if (error && error.code === '23505') {
      Alert.alert('Already added', 'This post is already in that album!');
    } else if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Added!', `Post added to "${albumName}"`);
      router.back();
    }
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
        <Text style={styles.headerText}>Add to Album</Text>
        <View style={{ width: 60 }} />
      </LinearGradient>

      <ScrollView style={styles.list}>
        {albums.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>No albums yet!</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/albums')}>
              <Text style={styles.createButtonText}>Create an Album</Text>
            </TouchableOpacity>
          </View>
        ) : (
          albums.map((album) => (
            <TouchableOpacity
              key={album.id}
              style={styles.albumCard}
              onPress={() => handleAddToAlbum(album.id, album.name)}>
              <Text style={styles.albumEmoji}>🗂️</Text>
              <Text style={styles.albumName}>{album.name}</Text>
              <Text style={styles.addIcon}>+</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  albumCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  albumEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  albumName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  addIcon: {
    fontSize: 24,
    color: '#b91d73',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#b91d73',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});