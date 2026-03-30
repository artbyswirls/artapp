import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  category: string;
  user_id: string;
};

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .or(`title.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) console.log('Search error:', error);
    else setPosts(data || []);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔍 Explore</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by title, category..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Go</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#9b59b6" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView>
          {searched && posts.length === 0 ? (
            <Text style={styles.empty}>No results found for "{query}"</Text>
          ) : (
            posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                onPress={() => router.push({ pathname: '../post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description } })}>
                <Image source={{ uri: post.image_url }} style={styles.image} />
                <View style={styles.cardInfo}>
                  <Text style={styles.title}>{post.title}</Text>
                  {post.category ? <Text style={styles.category}>#{post.category}</Text> : null}
                </View>
              </TouchableOpacity>
            ))
          )}
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
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
  },
  cardInfo: {
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  category: {
    fontSize: 14,
    color: '#9b59b6',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
});