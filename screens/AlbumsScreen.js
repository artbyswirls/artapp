import { useState } from 'react';
import { Button, FlatList, View } from 'react-native';
import AlbumCard from '../components/AlbumCard';

export default function AlbumsScreen({ navigation }) {
  const [albums] = useState([
    { id: '1', title: 'Vacation', cover_image: 'https://via.placeholder.com/300', post_count: 5 },
    { id: '2', title: 'Sketches', cover_image: 'https://via.placeholder.com/300', post_count: 3 },
  ]);

  return (
    <View style={{ flex: 1, padding: 8 }}>
      <Button
        title="Create New Album"
        onPress={() => navigation.navigate('CreateAlbum')}
      />

      <FlatList
        data={albums}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlbumCard
            album={item}
            onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id })}
          />
        )}
      />
    </View>
  );
}