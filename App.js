import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import your screens
import AlbumDetailScreen from './screens/AlbumDetailScreen';
import AlbumsScreen from './screens/AlbumsScreen';
import CreateAlbumScreen from './screens/CreateAlbumScreen';
import ExploreScreen from './screens/ExploreScreen';
import FeedScreen from './screens/FeedScreen';
import ProfileScreen from './screens/ProfileScreen';
import UploadScreen from './screens/UploadScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom tabs for main app
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root stack
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Main tabs */}
        <Stack.Screen
          name="Home"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        {/* Upload Screen */}
        <Stack.Screen
          name="Upload"
          component={UploadScreen}
          options={{ headerShown: false }}
        />

        {/* Albums screens */}
        <Stack.Screen
          name="Albums"
          component={AlbumsScreen}
          options={{ title: 'My Albums' }}
        />
        <Stack.Screen
          name="CreateAlbum"
          component={CreateAlbumScreen}
          options={{ title: 'Create Album' }}
        />
        <Stack.Screen
          name="AlbumDetail"
          component={AlbumDetailScreen}
          options={{ title: 'Album' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}