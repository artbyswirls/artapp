import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  category: string;
  user_id: string;
};

export default function ProfileScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editingBio, setEditingBio] = useState(false);
  const [editingSocials, setEditingSocials] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [newTiktok, setNewTiktok] = useState('');
  const [newTwitter, setNewTwitter] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [activeTab, setActiveTab] = useState('gallery');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;
    setUserId(uid);

    const { data: userData } = await supabase
      .from('users')
      .select('username, bio, avatar_url, instagram, tiktok, twitter, website')
      .eq('id', uid)
      .single();

    if (userData) {
      setUsername(userData.username);
      setBio(userData.bio || '');
      setNewBio(userData.bio || '');
      setAvatarUrl(userData.avatar_url);
      setInstagram(userData.instagram || '');
      setTiktok(userData.tiktok || '');
      setTwitter(userData.twitter || '');
      setWebsite(userData.website || '');
      setNewInstagram(userData.instagram || '');
      setNewTiktok(userData.tiktok || '');
      setNewTwitter(userData.twitter || '');
      setNewWebsite(userData.website || '');
    }

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (postsData) {
      setPosts(postsData);
      setPostCount(postsData.length);
    }

    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', uid);
    setFollowerCount(followers || 0);

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', uid);
    setFollowingCount(following || 0);

    setLoading(false);
  }

  async function fetchFavorites() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('favorites')
      .select('post_id, posts(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const favs = data.map((f: any) => f.posts).filter(Boolean);
      setFavoritePosts(favs);
    }
  }

  async function fetchLikedPosts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('likes')
      .select('post_id, posts(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const liked = data.map((l: any) => l.posts).filter(Boolean);
      setLikedPosts(liked);
    }
  }

  async function fetchRepostedPosts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', session.user.id)
      .ilike('title', '🔁%')
      .order('created_at', { ascending: false });

    if (data) setRepostedPosts(data);
  }

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && userId) {
      const uri = result.assets[0].uri;
      const fileName = `avatars/${userId}.jpg`;

      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, formData, { contentType: 'multipart/form-data', upsert: true });

      if (uploadError) { Alert.alert('Error', uploadError.message); return; }

      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(fileName);
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId);
      setAvatarUrl(publicUrl);
      Alert.alert('Success', 'Profile picture updated!');
    }
  }

  async function handleSaveBio() {
    if (!userId) return;
    await supabase.from('users').update({ bio: newBio }).eq('id', userId);
    setBio(newBio);
    setEditingBio(false);
  }

  async function handleSaveSocials() {
    if (!userId) return;
    await supabase.from('users').update({
      instagram: newInstagram,
      tiktok: newTiktok,
      twitter: newTwitter,
      website: newWebsite,
    }).eq('id', userId);
    setInstagram(newInstagram);
    setTiktok(newTiktok);
    setTwitter(newTwitter);
    setWebsite(newWebsite);
    setEditingSocials(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  function handleLongPress(postId: string) {
    setSelectMode(true);
    setSelectedPosts(new Set([postId]));
  }

  function handleSelectPost(postId: string) {
    if (!selectMode) return;
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) newSet.delete(postId);
      else newSet.add(postId);
      return newSet;
    });
  }

  function handleCancelSelect() {
    setSelectMode(false);
    setSelectedPosts(new Set());
  }

  async function handleDeleteSelected() {
    Alert.alert(
      'Delete Posts',
      `Are you sure you want to delete ${selectedPosts.size} post${selectedPosts.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const ids = Array.from(selectedPosts);
            await supabase.from('posts').delete().in('id', ids);
            setPosts(prev => prev.filter(p => !selectedPosts.has(p.id)));
            setPostCount(prev => prev - selectedPosts.size);
            setSelectMode(false);
            setSelectedPosts(new Set());
          }
        }
      ]
    );
  }

  function handleTabChange(tab: string) {
    setSelectMode(false);
    setSelectedPosts(new Set());
    setActiveTab(tab);
    if (tab === 'favorites') fetchFavorites();
    if (tab === 'likes') fetchLikedPosts();
    if (tab === 'reposts') fetchRepostedPosts();
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#f953c6" />
    </View>
  );

  const displayedPosts =
    activeTab === 'gallery' ? posts :
    activeTab === 'favorites' ? favoritePosts :
    activeTab === 'likes' ? likedPosts :
    repostedPosts;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#f953c6', '#b91d73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}>

        <TouchableOpacity style={styles.avatar} onPress={handlePickAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>👤</Text>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditText}>✏️</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.username}>@{username || 'Artist'}</Text>

        {editingBio ? (
          <View style={styles.bioEditContainer}>
            <TextInput
              style={styles.bioInput}
              value={newBio}
              onChangeText={setNewBio}
              placeholder="Write a bio..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              multiline
              maxLength={150}
            />
            <View style={styles.bioButtons}>
              <TouchableOpacity style={styles.bioSaveButton} onPress={handleSaveBio}>
                <Text style={styles.bioSaveText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bioCancelButton} onPress={() => setEditingBio(false)}>
                <Text style={styles.bioCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingBio(true)}>
            <Text style={styles.bio}>{bio || 'Tap to add a bio...'}</Text>
          </TouchableOpacity>
        )}

        {editingSocials ? (
          <View style={styles.socialsEditContainer}>
            <TextInput style={styles.socialInput} value={newInstagram} onChangeText={setNewInstagram} placeholder="Instagram username" placeholderTextColor="rgba(255,255,255,0.6)" />
            <TextInput style={styles.socialInput} value={newTiktok} onChangeText={setNewTiktok} placeholder="TikTok username" placeholderTextColor="rgba(255,255,255,0.6)" />
            <TextInput style={styles.socialInput} value={newTwitter} onChangeText={setNewTwitter} placeholder="X/Twitter username" placeholderTextColor="rgba(255,255,255,0.6)" />
            <TextInput style={styles.socialInput} value={newWebsite} onChangeText={setNewWebsite} placeholder="Website URL" placeholderTextColor="rgba(255,255,255,0.6)" autoCapitalize="none" />
            <View style={styles.bioButtons}>
              <TouchableOpacity style={styles.bioSaveButton} onPress={handleSaveSocials}>
                <Text style={styles.bioSaveText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bioCancelButton} onPress={() => setEditingSocials(false)}>
                <Text style={styles.bioCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.socialsRow}>
            {instagram ? <TouchableOpacity onPress={() => Linking.openURL(`https://instagram.com/${instagram}`)}><Text style={styles.socialLink}>📸 Instagram</Text></TouchableOpacity> : null}
            {tiktok ? <TouchableOpacity onPress={() => Linking.openURL(`https://www.tiktok.com/@${tiktok}`)}><Text style={styles.socialLink}>🎵 TikTok</Text></TouchableOpacity> : null}
            {twitter ? <TouchableOpacity onPress={() => Linking.openURL(`https://x.com/${twitter}`)}><Text style={styles.socialLink}>🐦 X/Twitter</Text></TouchableOpacity> : null}
            {website ? <TouchableOpacity onPress={() => Linking.openURL(website)}><Text style={styles.socialLink}>🌐 Website</Text></TouchableOpacity> : null}
            <TouchableOpacity onPress={() => setEditingSocials(true)}>
              <Text style={styles.editSocialsText}>{instagram || tiktok || twitter || website ? '✏️ Edit Links' : '➕ Add Social Links'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/messages')}>
            <Text style={styles.actionButtonText}>💬 Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/albums')}>
            <Text style={styles.actionButtonText}>🗂️ Albums</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {['gallery', 'favorites', 'likes', 'reposts'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => handleTabChange(tab)}>
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
              {tab === 'gallery' ? '🖼️ Gallery' : tab === 'favorites' ? '⭐ Favorites' : tab === 'likes' ? '❤️ Likes' : '🔁 Reposts'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectMode && activeTab === 'gallery' && (
        <View style={styles.selectBar}>
          <Text style={styles.selectCount}>{selectedPosts.size} selected</Text>
          <View style={styles.selectActions}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelSelectButton} onPress={handleCancelSelect}>
              <Text style={styles.cancelSelectText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {displayedPosts.length === 0 ? (
        <Text style={styles.empty}>
          {activeTab === 'gallery' ? "No posts yet!" :
           activeTab === 'favorites' ? "No favorites yet. Star some posts!" :
           activeTab === 'likes' ? "No liked posts yet!" :
           "No reposts yet!"}
        </Text>
      ) : (
        <View style={styles.grid}>
          {displayedPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.gridItem, selectMode && selectedPosts.has(post.id) && styles.selectedGridItem]}
              onPress={() => selectMode ? handleSelectPost(post.id) : router.push({ pathname: '/post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description, category: post.category, post_user_id: post.user_id } })}
              onLongPress={() => activeTab === 'gallery' && handleLongPress(post.id)}>
              <Image source={{ uri: post.image_url }} style={styles.gridImage} />
              {selectMode && selectedPosts.has(post.id) && (
                <View style={styles.selectedOverlay}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 40,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditText: {
    fontSize: 12,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  bioEditContainer: {
    width: '100%',
    marginBottom: 12,
  },
  bioInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
  },
  bioButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bioSaveButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  bioSaveText: {
    color: '#b91d73',
    fontWeight: '600',
  },
  bioCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  bioCancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  socialsEditContainer: {
    width: '100%',
    marginBottom: 12,
  },
  socialInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
  },
  socialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  socialLink: {
    color: '#fff',
    fontSize: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  editSocialsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  tabRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 0,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeTabButton: {
    backgroundColor: '#b91d73',
    borderColor: '#b91d73',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  selectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelSelectButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelSelectText: {
    color: '#333',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  gridItem: {
    width: '33%',
    aspectRatio: 1,
    padding: 2,
  },
  selectedGridItem: {
    opacity: 0.7,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    backgroundColor: 'rgba(185, 29, 115, 0.4)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#b91d73',
  },
  checkmark: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
    padding: 24,
  },
});