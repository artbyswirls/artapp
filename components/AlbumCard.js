import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AlbumCard({ album, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      
      {/* Album Cover */}
      <Image
        source={{
          uri: album?.cover_image || 'https://via.placeholder.com/300',
        }}
        style={styles.image}
      />

      {/* Album Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {album?.title || 'Untitled'}
        </Text>

        <Text style={styles.count}>
          {album?.post_count || 0} posts
        </Text>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
  },

  image: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#eee',
  },

  info: {
    marginTop: 6,
  },

  title: {
    fontSize: 14,
    fontWeight: '600',
  },

  count: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
});