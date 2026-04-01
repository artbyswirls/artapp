import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

type Post = {
  id: string;
  image_url: string;
  title: string;
  description: string;
  user_id: string;
};

export default function ArtistScreen() {
  const { user_id, username } = useLocalSearchParams<{ user_id: string; username: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userBio, setUserBio] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setCurrentUserId(session.user.id);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (postsData) setPosts(postsData);

    const { data: userData } = await supabase
      .from('users')
      .select('avatar_url, bio')
      .eq('id', user_id)
      .single();

    if (userData) {
      setAvatarUrl(userData.avatar_url);
      setUserBio(userData.bio || '');
    }

    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user_id);

    setFollowerCount(count || 0);

    if (session?.user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', session.user.id)
        .eq('following_id', user_id)
        .single();

      setFollowing(!!followData);

      const { data: blockData } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', session.user.id)
        .eq('blocked_id', user_id)
        .single();

      setIsBlocked(!!blockData);
    }

    setLoading(false);
  }

  async function handleFollow() {
    if (!currentUserId) return;

    if (following) {
      await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', user_id);
      setFollowing(false);
      setFollowerCount(prev => prev - 1);
    } else {
      await supabase.from('follows')
        .insert({ follower_id: currentUserId, following_id: user_id });
      setFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  }

  async function handleBlock() {
    if (!currentUserId) return;

    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
      isBlocked
        ? `Unblock @${username}? They will be able to see your posts again.`
        : `Block @${username}? They won't be able to interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            if (isBlocked) {
              await supabase.from('blocks')
                .delete()
                .eq('blocker_id', currentUserId)
                .eq('blocked_id', user_id);
              setIsBlocked(false);
            } else {
              await supabase.from('blocks')
                .insert({ blocker_id: currentUserId, blocked_id: user_id });
              setIsBlocked(true);
              if (following) {
                await supabase.from('follows')
                  .delete()
                  .eq('follower_id', currentUserId)
                  .eq('following_id', user_id);
                setFollowing(false);
              }
            }
            setShowMenu(false);
          }
        }
      ]
    );
  }

  async function handleReport() {
    if (!currentUserId || !reportReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your report.');
      return;
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      reported_user_id: user_id,
      reason: reportReason.trim(),
    });

    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
      setShowReportModal(false);
      setReportReason('');
    }
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#f953c6" />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#f953c6', '#b91d73']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {currentUserId !== user_id && (
            <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
              <Text style={styles.menuText}>⋯</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>👤</Text>
            )}
          </View>
          <Text style={styles.username}>@{username || 'Artist'}</Text>
          {userBio ? <Text style={styles.userBio}>{userBio}</Text> : null}
          <Text style={styles.followerCount}>{followerCount} {followerCount === 1 ? 'follower' : 'followers'}</Text>

          {currentUserId !== user_id && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.followButton, following && styles.followingButton]}
                onPress={handleFollow}>
                <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => router.push({ pathname: '/chat', params: { user_id, username } })}>
                <Text style={styles.messageButtonText}>💬 Message</Text>
              </TouchableOpacity>
            </View>
          )}

          {isBlocked && (
            <View style={styles.blockedBanner}>
              <Text style={styles.blockedText}>🚫 You have blocked this user</Text>
            </View>
          )}
        </View>

        <Text style={styles.galleryHeader}>Gallery</Text>

        {posts.length === 0 ? (
          <Text style={styles.empty}>No posts yet!</Text>
        ) : (
          <View style={styles.grid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.gridItem}
                onPress={() => router.push({ pathname: '/post', params: { id: post.id, image_url: post.image_url, title: post.title, description: post.description, post_user_id: post.user_id } })}>
                <Image source={{ uri: post.image_url }} style={styles.gridImage} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuModal}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowReportModal(true); }}>
              <Text style={styles.menuItemText}>🚩 Report User</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Text style={[styles.menuItemText, { color: '#ff3b30' }]}>
                {isBlocked ? '✅ Unblock User' : '🚫 Block User'}
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
              <Text style={[styles.menuItemText, { color: '#888' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModal}>
            <Text style={styles.reportTitle}>🚩 Report @{username}</Text>
            <Text style={styles.reportSubtitle}>Please describe why you are reporting this user</Text>
            <TextInput
              style={styles.reportInput}
              placeholder="Reason for report..."
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.reportButtons}>
              <TouchableOpacity style={styles.reportCancelButton} onPress={() => { setShowReportModal(false); setReportReason(''); }}>
                <Text style={styles.reportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportSubmitButton} onPress={handleReport}>
                <Text style={styles.reportSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  menuText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#f953c6',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 36,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  userBio: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  followerCount: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  followButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#9b59b6',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  followingButtonText: {
    color: '#9b59b6',
  },
  messageButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#9b59b6',
  },
  messageButtonText: {
    color: '#9b59b6',
    fontWeight: '600',
  },
  blockedBanner: {
    marginTop: 12,
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  blockedText: {
    color: '#ff3b30',
    fontSize: 14,
  },
  galleryHeader: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
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
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
    padding: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  menuModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  menuItem: {
    padding: 18,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  reportModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  reportInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 100,
  },
  reportButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  reportCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  reportCancelText: {
    color: '#888',
    fontWeight: '600',
  },
  reportSubmitButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  reportSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
});