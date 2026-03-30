import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { supabase } from '../../supabase';

export default function UploadScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }

  async function handleUpload() {
    if (!image || !title) {
      Alert.alert('Error', 'Please select an image and add a title');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const fileName = `${user?.id}/${Date.now()}.jpg`;

const formData = new FormData();
formData.append('file', {
  uri: image,
  name: fileName,
  type: 'image/jpeg',
} as any);

const { error: uploadError } = await supabase.storage
  .from('posts')
  .upload(fileName, formData, { contentType: 'multipart/form-data' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          image_url: publicUrl,
          title,
          description,
          category,
        });

      if (postError) throw postError;

      Alert.alert('Success', 'Your art has been posted!');
      setImage(null);
      setTitle('');
      setDescription('');
      setCategory('');

    } catch (error: any) {
      Alert.alert('Error', error.message);
    }

    setUploading(false);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Upload Your Art</Text>

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <Text style={styles.imagePickerText}>📸 Tap to select artwork</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TextInput
        style={styles.input}
        placeholder="Category (e.g. portrait, landscape, abstract)"
        value={category}
        onChangeText={setCategory}
      />

      <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={uploading}>
        <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Post Artwork'}</Text>
      </TouchableOpacity>
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
  imagePicker: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePickerText: {
    fontSize: 18,
    color: '#888',
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    width: '100%',
    backgroundColor: '#9b59b6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});