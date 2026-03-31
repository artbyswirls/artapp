import { useState } from 'react';
import { Button, TextInput, View } from 'react-native';
import { supabase } from '../supabase';

export default function CreateAlbumScreen({ navigation, user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const createAlbum = async () => {
    const { data, error } = await supabase.from('albums').insert([
      { user_id: user.id, title, description },
    ]);

    if (error) console.log(error);
    else navigation.goBack();
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Album Title"
        value={title}
        onChangeText={setTitle}
        style={{ borderBottomWidth: 1, marginBottom: 16 }}
      />
      <TextInput
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        style={{ borderBottomWidth: 1, marginBottom: 16 }}
      />
      <Button title="Create Album" onPress={createAlbum} />
    </View>
  );
}