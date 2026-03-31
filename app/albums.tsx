import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Album = {
  id: string;
  name: string;
  cover_image: string | null;
  post_count?: number;
};

export default function AlbumsScreen() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  async function fetchAlbums() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setUserId(session.user.id);

    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) console.log('Error:', error);
    else setAlbums(data || []);
    setLoading(false);
  }

  async function handleCreateAlbum() {
    if (!newAlbumName.trim() || !userId) return;

    const { error } = await supabase
      .from('albums')
      .insert({ user_id: userId, name: newAlbumName.trim() });

    if (error) Alert.alert('Error', error.message);
    else {
      setNewAlbumName('');
      setCreating(false);
      fetchAlbums();
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
        <Text style={styles.headerText}>My Albums</Text>
        <TouchableOpacity onPress={() => setCreating(true)}>
          <Text style={styles.addText}>+ New</Text>
        </TouchableOpacity>
      </LinearGradient>

      {creating && (
        <View style={styles.createContainer}>
          <TextInput
            style={styles.input}
            placeholder="Album name..."
            value={newAlbumName}
            onChangeText={setNewAlbumName}
            autoFocus
          />
          <View style={styles.createButtons}>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateAlbum}>
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setCreating(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.list}>
        {albums.length === 0 ? (
          <Text style={styles.empty}>No albums yet. Tap "+ New" to create one!</Text>
        ) : (
          albums.map((album) => (
            <TouchableOpacity
              key={album.id}
              style={styles.albumCard}
              onPress={() => router.push({ pathname: '/album', params: { album_id: album.id, album_name: album.name } })}>
              <View style={styles.albumCover}>
                {album.cover_image ? (
                  <Image source={{ uri: album.cover_image }} style={styles.coverImage} />
                ) : (
                  <Text style={styles.albumEmoji}>🗂️</Text>
                )}
              </View>
              <Text style={styles.albumName}>{album.name}</Text>
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
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  createButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#b91d73',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontWeight: '600',
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
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  albumEmoji: {
    fontSize: 28,
  },
  albumName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
});