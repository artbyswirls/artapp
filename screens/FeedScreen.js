import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { supabase } from '../supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const REPORT_REASONS = [
  'Selling or promoting items',
  'Scam, fraud or spam',
  'False information',
  'Bullying or harassment',
  'Hate speech',
  'AI generated content',
  'Other',
];

// ─── Avatar Component ─────────────────────────────────────────────────────
function Avatar({ url, size = 36, username }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#6200EA', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.4 }}>
        {username ? username[0].toUpperCase() : '?'}
      </Text>
    </View>
  );
}

// ─── Reply Item ───────────────────────────────────────────────────────────
function ReplyItem({ reply, colors, userId, onReplyToReply, onDeleteReply }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadReplyLikes();
  }, []);

  async function loadReplyLikes() {
    const { count } = await supabase
      .from('reply_likes')
      .select('*', { count: 'exact', head: true })
      .eq('reply_id', reply.id);
    setLikeCount(count || 0);

    if (userId) {
      const { data } = await supabase
        .from('reply_likes')
        .select('id')
        .eq('reply_id', reply.id)
        .eq('user_id', userId)
        .single();
      setLiked(!!data);
    }
  }

  async function handleLikeReply() {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    if (liked) {
      await supabase.from('reply_likes').delete()
        .eq('reply_id', reply.id).eq('user_id', userId);
      setLiked(false);
      setLikeCount((p) => Math.max(0, p - 1));
    } else {
      await supabase.from('reply_likes')
        .insert([{ reply_id: reply.id, user_id: userId }]);
      setLiked(true);
      setLikeCount((p) => p + 1);
    }
  }

  async function submitReplyToReply() {
    if (!replyText.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from('replies')
      .insert([{
        comment_id: reply.comment_id,
        user_id: userId,
        text: `@${reply.users?.username || 'user'} ${replyText.trim()}`,
      }]);
    if (error) {
      console.log('Error replying to reply:', error.message);
    } else {
      setReplyText('');
      setShowReplyInput(false);
      if (onReplyToReply) onReplyToReply();
    }
    setSending(false);
  }

  function handleDeleteReply() {
    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete this reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('replies')
              .delete()
              .eq('id', reply.id);
            if (!error && onDeleteReply) onDeleteReply();
          },
        },
      ]
    );
  }

  function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  return (
    <View>
      <View style={[styles.replyItem, { borderLeftColor: colors.primary }]}>
        <Avatar url={reply.users?.avatar_url} username={reply.users?.username} size={28} />
        <View style={styles.replyBody}>
          <TouchableOpacity
            onPress={() => {
              if (reply.users && reply.user_id) {
                router.push({
                  pathname: '/artist',
                  params: { user_id: reply.user_id, username: reply.users.username },
                });
              }
            }}
          >
            <Text style={[styles.replyUsername, { color: colors.primary }]}>
              {reply.users?.username || 'Unknown'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.replyText, { color: colors.text }]}>{reply.text}</Text>
          <Text style={[styles.replyTime, { color: colors.subtext }]}>
            {getTimeAgo(reply.created_at)}
          </Text>
          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={() => setShowReplyInput(!showReplyInput)}
              style={styles.commentActionBtn}
            >
              <Text style={[styles.commentActionText, { color: colors.subtext }]}>
                💬 Reply
              </Text>
            </TouchableOpacity>
            {reply.user_id === userId && (
              <TouchableOpacity onPress={handleDeleteReply} style={styles.commentActionBtn}>
                <Text style={[styles.commentActionText, { color: '#ff4444' }]}>
                  🗑️ Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={handleLikeReply} style={styles.replyLikeBtn}>
          <Animated.Text style={[styles.replyLikeIcon, { transform: [{ scale: likeScale }] }]}>
            {liked ? '❤️' : '🤍'}
          </Animated.Text>
          {likeCount > 0 && (
            <Text style={[styles.replyLikeCount, { color: colors.subtext }]}>{likeCount}</Text>
          )}
        </TouchableOpacity>
      </View>

      {showReplyInput && (
        <View style={[styles.replyInputRow, { marginLeft: 60 }]}>
          <TextInput
            style={[styles.replyInput, {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
              borderWidth: 1,
            }]}
            placeholder={`Reply to ${reply.users?.username || 'user'}...`}
            placeholderTextColor={colors.placeholder}
            value={replyText}
            onChangeText={setReplyText}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            onPress={submitReplyToReply}
            disabled={sending}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────
function CommentItem({ comment, userId, currentUserId, colors, onReplySubmit, onDeleteComment }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyCount, setReplyCount] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);

  useEffect(() => {
    loadCommentLikes();
    loadReplyCount();
  }, []);

  async function loadReplyCount() {
    const { count } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', comment.id);
    setReplyCount(count || 0);
  }

  async function loadReplies() {
    const { data: repliesData, error } = await supabase
      .from('replies')
      .select('*')
      .eq('comment_id', comment.id)
      .order('created_at', { ascending: true });

    if (error) { console.log('Error loading replies:', error.message); return; }
    if (!repliesData || repliesData.length === 0) { setReplies([]); return; }

    const userIds = [...new Set(repliesData.map((r) => r.user_id))];
    const { data: usersData } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', userIds);

    setReplies(repliesData.map((reply) => ({
      ...reply,
      users: usersData?.find((u) => u.id === reply.user_id) || null,
    })));
  }

  async function loadCommentLikes() {
    const { count } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', comment.id);
    setLikeCount(count || 0);

    if (userId) {
      const { data } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', comment.id)
        .eq('user_id', userId)
        .single();
      setLiked(!!data);
    }
  }

  async function handleLikeComment() {
    if (liked) {
      await supabase.from('comment_likes').delete()
        .eq('comment_id', comment.id).eq('user_id', userId);
      setLiked(false);
      setLikeCount((p) => Math.max(0, p - 1));
    } else {
      await supabase.from('comment_likes')
        .insert([{ comment_id: comment.id, user_id: userId }]);
      setLiked(true);
      setLikeCount((p) => p + 1);
    }
  }

  function handleDeleteComment() {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('comments').delete().eq('id', comment.id);
            if (!error && onDeleteComment) onDeleteComment(comment.id);
          },
        },
      ]
    );
  }

  async function submitReply() {
    if (!replyText.trim()) return;
    setLoadingReply(true);
    const { error } = await supabase
      .from('replies')
      .insert([{ comment_id: comment.id, user_id: userId, text: replyText.trim() }]);
    if (error) {
      console.log('Error sending reply:', error.message);
    } else {
      setReplyText('');
      setShowReplyInput(false);
      await loadReplies();
      await loadReplyCount();
      setShowReplies(true);
      if (onReplySubmit) onReplySubmit();
    }
    setLoadingReply(false);
  }

  async function handleReplyToReply() {
    await loadReplies();
    await loadReplyCount();
    setShowReplies(true);
  }

  async function handleDeleteReply() {
    await loadReplies();
    await loadReplyCount();
  }

  async function toggleReplies() {
    if (!showReplies) await loadReplies();
    setShowReplies(!showReplies);
  }

  function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  return (
    <View style={[styles.commentItem, { borderBottomColor: colors.border }]}>
      <View style={styles.commentTop}>
        <TouchableOpacity
          onPress={() => {
            if (comment.users && comment.user_id !== currentUserId) {
              router.push({
                pathname: '/artist',
                params: { user_id: comment.user_id, username: comment.users.username },
              });
            }
          }}
        >
          <Avatar url={comment.users?.avatar_url} username={comment.users?.username} size={36} />
        </TouchableOpacity>

        <View style={styles.commentBody}>
          <TouchableOpacity
            onPress={() => {
              if (comment.users && comment.user_id !== currentUserId) {
                router.push({
                  pathname: '/artist',
                  params: { user_id: comment.user_id, username: comment.users.username },
                });
              }
            }}
          >
            <Text style={[styles.commentUsername, { color: colors.primary }]}>
              {comment.users?.username || 'Unknown'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.commentText, { color: colors.text }]}>{comment.text}</Text>
          <Text style={[styles.commentTime, { color: colors.subtext }]}>
            {getTimeAgo(comment.created_at)}
          </Text>

          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={() => setShowReplyInput(!showReplyInput)}
              style={styles.commentActionBtn}
            >
              <Text style={[styles.commentActionText, { color: colors.subtext }]}>💬 Reply</Text>
            </TouchableOpacity>

            {replyCount > 0 && (
              <TouchableOpacity onPress={toggleReplies} style={styles.commentActionBtn}>
                <Text style={[styles.commentActionText, { color: colors.primary }]}>
                  {showReplies ? '▲ Hide replies' : `▼ View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                </Text>
              </TouchableOpacity>
            )}

            {comment.user_id === currentUserId && (
              <TouchableOpacity onPress={handleDeleteComment} style={styles.commentActionBtn}>
                <Text style={[styles.commentActionText, { color: '#ff4444' }]}>🗑️ Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={handleLikeComment} style={styles.commentLikeBtn}>
          <Text style={styles.commentLikeIcon}>{liked ? '❤️' : '🤍'}</Text>
          {likeCount > 0 && (
            <Text style={[styles.commentLikeCount, { color: colors.subtext }]}>{likeCount}</Text>
          )}
        </TouchableOpacity>
      </View>

      {showReplyInput && (
        <View style={styles.replyInputRow}>
          <TextInput
            style={[styles.replyInput, {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
              borderWidth: 1,
            }]}
            placeholder={`Reply to ${comment.users?.username || 'comment'}...`}
            placeholderTextColor={colors.placeholder}
            value={replyText}
            onChangeText={setReplyText}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            onPress={submitReply}
            disabled={loadingReply}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      )}

      {showReplies && (
        <View style={styles.repliesList}>
          {replies.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                colors={colors}
                userId={userId}
                onReplyToReply={handleReplyToReply}
                onDeleteReply={handleDeleteReply}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ─── Comment Modal ────────────────────────────────────────────────────────
function CommentModal({ visible, onClose, postId, userId, colors }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
      loadCurrentUser();
    }
  }, [visible, postId]);

  async function loadCurrentUser() {
    if (!userId) return;
    const { data } = await supabase
      .from('users').select('username, avatar_url').eq('id', userId).single();
    setCurrentUser(data);
  }

  async function loadComments() {
    const { data: commentsData, error } = await supabase
      .from('comments').select('*').eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) { console.log('Error loading comments:', error.message); return; }
    if (!commentsData || commentsData.length === 0) { setComments([]); return; }

    const userIds = [...new Set(commentsData.map((c) => c.user_id))];
    const { data: usersData } = await supabase
      .from('users').select('id, username, avatar_url').in('id', userIds);

    setComments(commentsData.map((comment) => ({
      ...comment,
      users: usersData?.find((u) => u.id === comment.user_id) || null,
    })));
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from('comments')
      .insert([{ user_id: userId, post_id: postId, text: newComment.trim() }]);
    if (!error) { setNewComment(''); loadComments(); }
    setLoading(false);
  }

  function handleDeleteComment(commentId) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.commentSheet, { backgroundColor: colors.card }]}
        >
          <View style={[styles.commentHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.commentTitle, { color: colors.text }]}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: colors.subtext }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.commentList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {comments.length === 0 ? (
              <View style={styles.noComments}>
                <Text style={{ color: colors.subtext, fontSize: 15 }}>
                  No comments yet. Be first! 💬
                </Text>
              </View>
            ) : (
              comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  userId={userId}
                  currentUserId={userId}
                  colors={colors}
                  onReplySubmit={loadComments}
                  onDeleteComment={handleDeleteComment}
                />
              ))
            )}
          </ScrollView>

          <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
            <Avatar url={currentUser?.avatar_url} username={currentUser?.username} size={32} />
            <TextInput
              style={[styles.commentInput, {
                backgroundColor: colors.inputBackground,
                color: colors.text,
              }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.placeholder}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              onPress={submitComment}
              disabled={loading}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Single Post Card ─────────────────────────────────────────────────────
function PostCard({ item, userId, colors, isDark, cardHeight }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const favoriteScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (userId && item.id) {
      loadCounts();
      checkUserActions();
    }
  }, [userId, item.id]);

  async function loadCounts() {
    const { count: lCount } = await supabase
      .from('likes').select('*', { count: 'exact', head: true }).eq('post_id', item.id);
    setLikeCount(lCount || 0);

    const { count: fCount } = await supabase
      .from('favorites').select('*', { count: 'exact', head: true }).eq('post_id', item.id);
    setFavoriteCount(fCount || 0);

    const { count: cCount } = await supabase
      .from('comments').select('*', { count: 'exact', head: true }).eq('post_id', item.id);
    setCommentCount(cCount || 0);
  }

  async function checkUserActions() {
    const { data: likeData } = await supabase
      .from('likes').select('id').eq('post_id', item.id).eq('user_id', userId).single();
    setLiked(!!likeData);

    const { data: favData } = await supabase
      .from('favorites').select('id').eq('post_id', item.id).eq('user_id', userId).single();
    setFavorited(!!favData);
  }

  function bounce(animValue) {
    Animated.sequence([
      Animated.spring(animValue, { toValue: 1.4, useNativeDriver: true }),
      Animated.spring(animValue, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }

  async function handleLike() {
    bounce(likeScale);
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', item.id).eq('user_id', userId);
      setLiked(false);
      setLikeCount((p) => Math.max(0, p - 1));
    } else {
      await supabase.from('likes').insert([{ post_id: item.id, user_id: userId }]);
      setLiked(true);
      setLikeCount((p) => p + 1);
    }
  }

  async function handleFavorite() {
    bounce(favoriteScale);
    if (favorited) {
      await supabase.from('favorites').delete().eq('post_id', item.id).eq('user_id', userId);
      setFavorited(false);
      setFavoriteCount((p) => Math.max(0, p - 1));
    } else {
      await supabase.from('favorites').insert([{ post_id: item.id, user_id: userId }]);
      setFavorited(true);
      setFavoriteCount((p) => p + 1);
    }
  }

  async function handleSubmitReport() {
    if (!selectedReason) { Alert.alert('Please select a reason'); return; }
    setReportSubmitting(true);
    const finalReason = selectedReason === 'Other'
      ? otherReason.trim() || 'Other'
      : selectedReason;

    const { error } = await supabase.from('reports').insert({
      reporter_id: userId,
      post_id: item.id,
      reported_user_id: item.user_id,
      reason: finalReason,
    });

    setReportSubmitting(false);
    if (error) {
      Alert.alert('Error', 'Failed to submit report');
    } else {
      setShowReport(false);
      setSelectedReason('');
      setOtherReason('');
      Alert.alert('✅ Report Submitted', 'Thank you! We will review this post.');
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const bottomPadding = insets.bottom - 20;

  return (
    <View style={{ width: SCREEN_WIDTH, height: cardHeight, backgroundColor: '#000' }}>
      <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <View style={styles.topFade} />
      <View style={styles.bottomFade} />

      {/* Bottom Left Info */}
      <View style={[styles.bottomLeft, { bottom: bottomPadding }]}>
        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.postDate}>{formatDate(item.created_at)}</Text>
        {item.description ? (
          <Text style={styles.postDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {item.category ? (
          <Text style={styles.postCategory}>#{item.category}</Text>
        ) : null}

        {/* ✅ Report button - only on other people's posts */}
        {userId && item.user_id && userId !== item.user_id && (
          <TouchableOpacity
            onPress={() => setShowReport(true)}
            style={styles.reportBtn}
          >
            <Text style={styles.reportBtnText}>🚩 Report</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Right Side TikTok Buttons */}
      <View style={[styles.rightSide, { bottom: bottomPadding }]}>
        <View style={styles.actionItem}>
          <TouchableOpacity onPress={handleLike}>
            <Animated.Text style={[styles.actionIcon, { transform: [{ scale: likeScale }] }]}>
              {liked ? '❤️' : '🤍'}
            </Animated.Text>
          </TouchableOpacity>
          <Text style={styles.actionCount}>{likeCount}</Text>
        </View>

        <View style={styles.actionItem}>
          <TouchableOpacity onPress={() => setShowComments(true)}>
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
          <Text style={styles.actionCount}>{commentCount}</Text>
        </View>

        <View style={styles.actionItem}>
          <TouchableOpacity onPress={handleFavorite}>
            <Animated.Text style={[styles.actionIcon, { transform: [{ scale: favoriteScale }] }]}>
              {favorited ? '⭐' : '☆'}
            </Animated.Text>
          </TouchableOpacity>
          <Text style={styles.actionCount}>{favoriteCount}</Text>
        </View>

        <View style={styles.actionItem}>
          <TouchableOpacity>
            <Text style={styles.actionIcon}>↗️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comment Modal */}
      <CommentModal
        visible={showComments}
        onClose={() => { setShowComments(false); loadCounts(); }}
        postId={item.id}
        userId={userId}
        colors={colors}
      />

      {/* ✅ Report Modal */}
      <Modal
        visible={showReport}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReport(false)}
      >
        <View style={styles.reportOverlay}>
          <View style={[styles.reportSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.reportHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.reportTitle, { color: colors.text }]}>🚩 Report Post</Text>
              <TouchableOpacity onPress={() => {
                setShowReport(false);
                setSelectedReason('');
                setOtherReason('');
              }}>
                <Text style={{ fontSize: 22, color: colors.subtext }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.reportSubtitle, { color: colors.subtext }]}>
              Why are you reporting this post?
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonItem,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selectedReason === reason && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '20',
                    },
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View style={[
                    styles.reasonRadio,
                    { borderColor: colors.border },
                    selectedReason === reason && { borderColor: colors.primary },
                  ]}>
                    {selectedReason === reason && (
                      <View style={[styles.reasonRadioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.reasonText,
                    { color: colors.text },
                    selectedReason === reason && { color: colors.primary, fontWeight: '600' },
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedReason === 'Other' && (
                <TextInput
                  style={[styles.otherInput, {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  placeholder="Please describe the issue..."
                  placeholderTextColor={colors.placeholder}
                  value={otherReason}
                  onChangeText={setOtherReason}
                  multiline
                  numberOfLines={3}
                  autoFocus
                />
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.reportSubmitBtn, !selectedReason && { opacity: 0.5 }]}
              onPress={handleSubmitReport}
              disabled={!selectedReason || reportSubmitting}
            >
              <Text style={styles.reportSubmitText}>
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Feed Screen ─────────────────────────────────────────────────────
export default function FeedScreen() {
  const { colors, isDark } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [cardHeight, setCardHeight] = useState(SCREEN_HEIGHT);

  useEffect(() => {
    getUser();
    fetchPosts();
  }, []);

  async function getUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setUserId(session.user.id);
  }

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts').select('*').order('created_at', { ascending: false });
    if (error) console.log(error);
    else setPosts(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, fontSize: 18 }}>No posts yet 🎨</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
    >
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <PostCard
            item={item}
            userId={userId}
            colors={colors}
            isDark={isDark}
            cardHeight={cardHeight}
          />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topFade: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 60, backgroundColor: 'rgba(0,0,0,0.1)',
  },
  bottomFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 100, backgroundColor: 'rgba(0,0,0,0.05)',
  },
  bottomLeft: { position: 'absolute', left: 15, right: 90 },
  postTitle: {
    fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  postDate: {
    fontSize: 12, color: '#DDDDDD', marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  postDesc: {
    fontSize: 13, color: '#EEEEEE', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  postCategory: {
    fontSize: 13, color: '#BB86FC', fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  reportBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,0,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.3)',
  },
  reportBtnText: {
    color: '#ff6666',
    fontSize: 12,
    fontWeight: '600',
  },
  rightSide: { position: 'absolute', right: 12, alignItems: 'center', gap: 24 },
  actionItem: { alignItems: 'center' },
  actionIcon: { fontSize: 36 },
  actionCount: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  commentSheet: {
    height: SCREEN_HEIGHT * 0.65, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, overflow: 'hidden',
  },
  commentHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, borderBottomWidth: 1,
  },
  commentTitle: { fontSize: 18, fontWeight: 'bold' },
  commentList: { flex: 1, padding: 16 },
  noComments: { alignItems: 'center', paddingVertical: 40 },
  commentItem: { paddingVertical: 12, borderBottomWidth: 1 },
  commentTop: { flexDirection: 'row', gap: 10 },
  commentBody: { flex: 1 },
  commentUsername: { fontSize: 13, fontWeight: 'bold', marginBottom: 3 },
  commentText: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  commentTime: { fontSize: 11, marginBottom: 6 },
  commentActions: { flexDirection: 'row', gap: 15, flexWrap: 'wrap' },
  commentActionBtn: { paddingVertical: 2 },
  commentActionText: { fontSize: 12, fontWeight: '600' },
  commentLikeBtn: { alignItems: 'center', paddingLeft: 8 },
  commentLikeIcon: { fontSize: 18 },
  commentLikeCount: { fontSize: 11, marginTop: 2 },
  replyInputRow: {
    flexDirection: 'row', marginTop: 8, marginLeft: 46, gap: 8, alignItems: 'center',
  },
  replyInput: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  repliesList: { marginLeft: 46, marginTop: 8 },
  replyItem: {
    flexDirection: 'row', gap: 8, marginBottom: 10,
    paddingLeft: 10, borderLeftWidth: 2, alignItems: 'flex-start',
  },
  replyBody: { flex: 1 },
  replyUsername: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  replyText: { fontSize: 13, lineHeight: 18, marginBottom: 2 },
  replyTime: { fontSize: 11, marginBottom: 4 },
  replyLikeBtn: { alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  replyLikeIcon: { fontSize: 16 },
  replyLikeCount: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  commentInputRow: {
    flexDirection: 'row', padding: 12, borderTopWidth: 1, gap: 10, alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10,
    fontSize: 14, maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

  // ── Report Styles ──
  reportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reportSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  reportHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1,
  },
  reportTitle: { fontSize: 20, fontWeight: 'bold' },
  reportSubtitle: { fontSize: 14, marginBottom: 16 },
  reasonItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, gap: 12,
  },
  reasonRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  reasonRadioInner: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { fontSize: 15, flex: 1 },
  otherInput: {
    borderRadius: 12, padding: 14, fontSize: 14, textAlignVertical: 'top',
    marginBottom: 8, minHeight: 80, borderWidth: 1,
  },
  reportSubmitBtn: { backgroundColor: '#ff3b30', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  reportSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});