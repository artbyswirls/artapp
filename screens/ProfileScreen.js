import { Button, Text, View } from 'react-native';

export default function ProfileScreen({ navigation }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>My Profile</Text>

      <Button
        title="My Albums"
        onPress={() => navigation.navigate('Albums')}
      />
    </View>
  );
}