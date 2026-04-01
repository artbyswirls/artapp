import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

export default function SetupScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers and underscores');
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (existing) {
      Alert.alert('Error', 'That username is already taken. Please choose another.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('users')
      .upsert({
        id: session.user.id,
        username: username.trim().toLowerCase(),
      });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)');
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={['#f953c6', '#b91d73', '#4776e6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}>

        <View style={styles.content}>
          <Text style={styles.emoji}>🎨</Text>
          <Text style={styles.title}>Welcome to ArtApp!</Text>
          <Text style={styles.subtitle}>Choose a username to get started</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          <Text style={styles.hint}>Letters, numbers and underscores only</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSetup}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#b91d73" />
            ) : (
              <Text style={styles.buttonText}>Get Started 🚀</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    width: '100%',
    marginBottom: 8,
  },
  atSign: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 4,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#b91d73',
    fontSize: 18,
    fontWeight: 'bold',
  },
});