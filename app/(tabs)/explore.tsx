import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

const CATEGORIES = ['portrait', 'landscape', 'abstract', 'digital', 'photography', 'traditional', 'fantasy', 'anime'];

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
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    fetchAllPosts();
  }, []);

  async function fetchAllPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.log('Error:', error);
    else setPosts(data || []);
    setLoading(false);
  }

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery || query;
    setLoading(true);

    if (!q.trim()) {
      fetchAllPosts();
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .or(`title.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
      .order('created_at', { ascending: false });

    if (error) console.log('Error:', error);
    else setPosts(data || []);
    setLoading(false);
  }

  function handleCategoryPress(category: string) {
    if (activeCategory === category) {
      setActiveCategory('');
      setQuery('');
      fetchAllPosts();
    } else {
      setActiveCategory(category);
      setQuery(category);
      handleSearch(category);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4776e6', '#8e54e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}>
        <Text style={styles.headerText}>🔍 Explore</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search art, categories..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()}>
            <Text style={styles.searchButtonText}>Go</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, activeCategory === cat && styles.activeCategoryChip]}
            onPress={() => handleCategoryPress(cat)}>
            <Text style={[styles.categoryChipText, activeCategory === cat && styles.activeCategoryChipText]}>
              #{cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#8e54e9" style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>No results found!</Text>
      ) : (
        <ScrollView style={styles.results}>
          <View style={styles.grid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.gridItem}
                onPress={() => router.push({ pathname: '/post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description, category: post.category, post_user_id: post.user_id } })}>
                <Image source={{ uri: post.image_url }} style={styles.gridImage} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 1,
  },
  searchRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  searchButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#8e54e9',
    fontWeight: 'bold',
    fontSize: 16,
  },
  categoriesRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 0,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeCategoryChip: {
    backgroundColor: '#8e54e9',
    borderColor: '#8e54e9',
  },
  categoryChipText: {
    color: '#555',
    fontSize: 14,
  },
  activeCategoryChipText: {
    color: '#fff',
  },
  results: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
});