import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ThemeProvider as CustomThemeProvider } from '../constants/ThemeContext';
import { supabase } from '../supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', session.user.id)
          .single();

        if (!userData?.username) {
          router.replace('/setup');
        } else {
          router.replace('/(tabs)');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
      if (event === 'SIGNED_IN' && session) {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', session.user.id)
          .single();

        if (!userData?.username) {
          router.replace('/setup');
        } else {
          router.replace('/(tabs)');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    // ✅ Our custom theme wraps everything
    <CustomThemeProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="post" options={{ headerShown: false }} />
          <Stack.Screen name="artist" options={{ headerShown: false }} />
          <Stack.Screen name="messages" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="albums" options={{ headerShown: false }} />
          <Stack.Screen name="album" options={{ headerShown: false }} />
          <Stack.Screen name="addtoalbum" options={{ headerShown: false }} />
          <Stack.Screen name="editpost" options={{ headerShown: false }} />
          <Stack.Screen name="trending" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </CustomThemeProvider>
  );
}