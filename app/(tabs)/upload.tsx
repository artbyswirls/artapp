import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

const CATEGORIES = ['portrait', 'landscape', 'abstract', 'digital', 'photography', 'traditional', 'fantasy', 'anime'];

type User = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export default function UploadScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagQuery, setTagQuery] = useState('');

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  }

  async function handleDescriptionChange(text: string) {
    setDescription(text);

    const atIndex = text.lastIndexOf('@');
    if (atIndex !== -1) {
      const query = text.slice(atIndex + 1).split(' ')[0];
      if (query.length > 0) {
        setTagQuery(query);
        const { data } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .ilike('username', `%${query}%`)
          .limit(5);
        setUserSuggestions(data || []);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }

  function handleSelectUser(user: User) {
    const atIndex = description.lastIndexOf('@');
    const newDescription = description.slice(0, atIndex) + `@${user.username} `;
    setDescription(newDescription);
    setShowSuggestions(false);

    if (!taggedUsers.find(u => u.id === user.id)) {
      setTaggedUsers(prev => [...prev, user]);
    }
  }

  function removeTag(userId: string) {
    setTaggedUsers(prev => prev.filter(u => u.id !== userId));
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

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({ user_id: user?.id, image_url: publicUrl, title, description, category })
        .select()
        .single();

      if (postError) throw postError;

      if (taggedUsers.length > 0 && postData) {
        await supabase.from('post_tags').insert(
          taggedUsers.map(u => ({ post_id: postData.id, tagged_user_id: u.id }))
        );
      }

      Alert.alert('🎨 Posted!', 'Your art has been shared!');
      setImage(null);
      setTitle('');
      setDescription('');
      setCategory('');
      setTaggedUsers([]);
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

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

        <TextInput
          style={styles.input}
          placeholder="Title *"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#aaa"
        />

        <View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description — type @ to tag someone"
            value={description}
            onChangeText={handleDescriptionChange}
            multiline
            numberOfLines={3}
            placeholderTextColor="#aaa"
          />
          {showSuggestions && userSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              {userSuggestions.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectUser(user)}>
                  <View style={styles.suggestionAvatar}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.suggestionAvatarImage} />
                    ) : (
                      <Text style={styles.suggestionAvatarEmoji}>👤</Text>
                    )}
                  </View>
                  <Text style={styles.suggestionUsername}>@{user.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {taggedUsers.length > 0 && (
          <View style={styles.taggedContainer}>
            <Text style={styles.taggedLabel}>Tagged:</Text>
            <View style={styles.taggedList}>
              {taggedUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.tagChip}
                  onPress={() => removeTag(user.id)}>
                  <Text style={styles.tagChipText}>@{user.username} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  suggestionAvatarImage: {
    width: '100%',
    height: '100%',
  },
  suggestionAvatarEmoji: {
    fontSize: 18,
  },
  suggestionUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  taggedContainer: {
    marginBottom: 12,
  },
  taggedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  taggedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#f0e6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#9b59b6',
  },
  tagChipText: {
    color: '#9b59b6',
    fontSize: 13,
    fontWeight: '600',
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