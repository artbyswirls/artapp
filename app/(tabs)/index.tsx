import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function FeedScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🎨 ArtApp</Text>
      <View style={styles.card}>
        <View style={styles.imagePlaceholder} />
        <Text style={styles.artistName}>Artist Name</Text>
        <Text style={styles.artTitle}>Artwork Title</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.imagePlaceholder} />
        <Text style={styles.artistName}>Artist Name</Text>
        <Text style={styles.artTitle}>Artwork Title</Text>
      </View>
    </ScrollView>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 10,
  },
  artistName: {
    fontSize: 14,
    color: '#888',
  },
  artTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});