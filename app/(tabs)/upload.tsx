import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

const CATEGORIES = ['portrait', 'landscape', 'abstract', 'digital', 'photography', 'traditional', 'fantasy', 'anime'];

export default function UploadScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setAiSuggestion('');
      analyzeImage(result.assets[0].base64 || '');
    }
  }

  async function analyzeImage(base64: string) {
    if (!base64) return;
    setAnalyzing(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64,
                  },
                },
                {
                  type: 'text',
                  text: 'Look at this artwork and suggest ONE category from this list that best fits it: portrait, landscape, abstract, digital, photography, traditional, fantasy, anime. Reply with ONLY the single word category, nothing else.',
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const suggestion = data.content?.[0]?.text?.trim().toLowerCase() || '';

      if (CATEGORIES.includes(suggestion)) {
        setAiSuggestion(suggestion);
        setCategory(suggestion);
      }
    } catch (error) {
      console.log('AI analysis error:', error);
    }

    setAnalyzing(false);
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
        .insert({ user_id: user?.id, image_url: publicUrl, title, description, category });

      if (postError) throw postError;

      Alert.alert('🎨 Posted!', 'Your art has been shared!');
      setImage(null);
      setImageBase64(null);
      setTitle('');
      setDescription('');
      setCategory('');
      setAiSuggestion('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
    setUploading(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={['#f953c6', '#b91d73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}>
        <Text style={styles.headerText}>➕ Upload Art</Text>
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePickerEmoji}>🖼️</Text>
              <Text style={styles.imagePickerText}>Tap to select artwork</Text>
            </View>
          )}
        </TouchableOpacity>

        {analyzing && (
          <View style={styles.aiContainer}>
            <ActivityIndicator size="small" color="#b91d73" />
            <Text style={styles.aiText}>🤖 AI is analyzing your artwork...</Text>
          </View>
        )}

        {aiSuggestion ? (
          <View style={styles.aiContainer}>
            <Text style={styles.aiText}>🤖 AI suggested: <Text style={styles.aiSuggestion}>#{aiSuggestion}</Text></Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Title *"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#aaa"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.categoryLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.activeCategoryChip]}
              onPress={() => setCategory(cat)}>
              <Text style={[styles.categoryChipText, category === cat && styles.activeCategoryChipText]}>
                #{cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
          <LinearGradient
            colors={['#f953c6', '#b91d73']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadGradient}>
            <Text style={styles.uploadButtonText}>{uploading ? 'Posting...' : '🚀 Post Artwork'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  imagePicker: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#aaa',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  aiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiText: {
    fontSize: 14,
    color: '#555',
  },
  aiSuggestion: {
    color: '#b91d73',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  categoriesRow: {
    marginBottom: 20,
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
    backgroundColor: '#b91d73',
    borderColor: '#b91d73',
  },
  categoryChipText: {
    color: '#555',
    fontSize: 14,
  },
  activeCategoryChipText: {
    color: '#fff',
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  uploadGradient: {
    padding: 18,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});