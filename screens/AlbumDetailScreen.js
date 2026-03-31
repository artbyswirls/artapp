import { useEffect, useState } from 'react';
import { FlatList, Image, View } from 'react-native';
import { supabase } from '../supabase';

export default function AlbumDetailScreen({ route }) {
  const { albumId } = route.params;
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchAlbumPosts();
  }, []);

  const fetchAlbumPosts = async () => {
    const { data, error } = await supabase
      .from('album_posts')
      .select('posts(*)')
      .eq('album_id', albumId);

    if (error) console.log(error);
    else setPosts(data.map((item) => item.posts));
  };

  return (
    <View style={{ flex: 1, padding: 8 }}>
      <FlatList
        data={posts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: '48%', height: 150, margin: '1%' }}
          />
        )}
      />
    </View>
  );
}