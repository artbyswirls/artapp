// ============================================
// App.js
// ============================================

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from './constants/ThemeContext';
import { supabase } from './supabase';

// Import all your screens
import AlbumDetailScreen from './screens/AlbumDetailScreen';
import AlbumsScreen from './screens/AlbumsScreen';
import CreateAlbumScreen from './screens/CreateAlbumScreen';
import ExploreScreen from './screens/ExploreScreen';
import FeedScreen from './screens/FeedScreen';
import ProfileScreen from './screens/ProfileScreen';
import UploadScreen from './screens/UploadScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ---- DARK MODE TOGGLE BUTTON ----
// Put this in any header you want
function DarkModeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();
  return (
    <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={24}
        color={colors.icon}
      />
    </TouchableOpacity>
  );
}

// ---- BOTTOM TAB NAVIGATOR ----
function MainTabs() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Tab bar colors change with dark mode
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        headerStyle: {
          backgroundColor: colors.header,
        },
        headerTintColor: colors.text,
        // Dark mode toggle button in every header
        headerRight: () => <DarkModeToggle />,
        // Tab bar icons
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Albums') {
            iconName = focused ? 'images' : 'images-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Albums" component={AlbumsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ---- MAIN APP WITH NAVIGATION ----
function AppContent() {
  const { colors } = useTheme();
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AlbumDetail"
          component={AlbumDetailScreen}
          options={{ title: 'Album' }}
        />
        <Stack.Screen
          name="CreateAlbum"
          component={CreateAlbumScreen}
          options={{ title: 'Create Album' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ---- ROOT APP - Wraps everything with ThemeProvider ----
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}