import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
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
import { supabase } from '../supabase';

type Reply = {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
};

type Comment = {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
  like_count?: number;
  is_liked?: boolean;
  replies?: Reply[];
  showReplies?: boolean;
};

type User = {
  id: string;
  username: string;
  avatar_url: string | null;
};

// ── Report reasons ──────────────────────────────────────────────────────
const REPORT_REASONS = [
  'Selling or promoting items',
  'Scam, fraud or spam',
  'False information',
  'Bullying or harassment',
  'Hate speech',
  'AI generated content',
  'Other',
];

function CommentText({ text }: { text: string }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <Text style={styles.commentText}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Text
              key={index}
              style={styles.mentionText}
              onPress={async () => {
                const { data } = await supabase
                  .from('users')
                  .select('id')
                  .eq('username', username)
                  .single();
                if (data) {
                  router.push({ pathname: '/artist', params: { user_id: data.id, username } });
                }
              }}>
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

export default function PostScreen() {
  const { id, image_url, title, description, category, post_user_id } = useLocalSearchParams<{
    id: string;
    image_url: string;
    title: string;
    description: string;
    category: string;
    post_user_id: string;
  }>();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentSuggestions, setCommentSuggestions] = useState<User[]>([]);
  const [replySuggestions, setReplySuggestions] = useState<User[]>([]);
  const [showCommentSuggestions, setShowCommentSuggestions] = useState(false);
  const [showReplySuggestions, setShowReplySuggestions] = useState(false);

  // ── Report state ──
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  async function fetchComments() {
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('comments')
      .select('*, users(username, avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) console.log('Error fetching comments:', error);
    else {
      const commentsWithData = await Promise.all((data || []).map(async (comment: any) => {
        const { count: likeCount } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        let isLiked = false;
        if (session?.user) {
          const { data: likeData } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', session.user.id)
            .single();
          isLiked = !!likeData;
        }

        const { data: repliesData } = await supabase
          .from('comment_replies')
          .select('*, users(username, avatar_url)')
          .eq('comment_id', comment.id)
          .order('created_at', { ascending: true });

        const replies = (repliesData || []).map((reply: any) => ({
          ...reply,
          username: reply.users?.username || 'Artist',
          avatar_url: reply.users?.avatar_url || null,
        }));

        return {
          ...comment,
          username: comment.users?.username || 'Artist',
          avatar_url: comment.users?.avatar_url || null,
          like_count: likeCount || 0,
          is_liked: isLiked,
          replies,
          showReplies: false,
        };
      }));
      setComments(commentsWithData);
    }
  }

  async function searchUsers(query: string, isReply: boolean) {
    if (!query) {
      isReply ? setShowReplySuggestions(false) : setShowCommentSuggestions(false);
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(5);

    if (isReply) {
      setReplySuggestions(data || []);
      setShowReplySuggestions(true);
    } else {
      setCommentSuggestions(data || []);
      setShowCommentSuggestions(true);
    }
  }

  async function handleCommentChange(text: string) {
    setNewComment(text);
    const atIndex = text.lastIndexOf('@');
    if (atIndex !== -1) {
      const query = text.slice(atIndex + 1).split(' ')[0];
      if (query.length > 0) await searchUsers(query, false);
      else setShowCommentSuggestions(false);
    } else {
      setShowCommentSuggestions(false);
    }
  }

  async function handleReplyChange(text: string) {
    setReplyText(text);
    const atIndex = text.lastIndexOf('@');
    if (atIndex !== -1) {
      const query = text.slice(atIndex + 1).split(' ')[0];
      if (query.length > 0) await searchUsers(query, true);
      else setShowReplySuggestions(false);
    } else {
      setShowReplySuggestions(false);
    }
  }

  function selectCommentTag(user: User) {
    const atIndex = newComment.lastIndexOf('@');
    setNewComment(newComment.slice(0, atIndex) + `@${user.username} `);
    setShowCommentSuggestions(false);
  }

  function selectReplyTag(user: User) {
    const atIndex = replyText.lastIndexOf('@');
    setReplyText(replyText.slice(0, atIndex) + `@${user.username} `);
    setShowReplySuggestions(false);
  }

  async function handleComment() {
    if (!newComment.trim()) return;
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id: userId, text: newComment.trim() });

    if (error) Alert.alert('Error', error.message);
    else {
      setNewComment('');
      setShowCommentSuggestions(false);
      fetchComments();
    }
  }

  async function handleLikeComment(commentId: string, isLiked: boolean) {
    if (!userId) return;

    if (isLiked) {
      await supabase.from('comment_likes').delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);
    } else {
      await supabase.from('comment_likes').insert({
        comment_id: commentId,
        user_id: userId,
      });
    }

    setComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      is_liked: !isLiked,
      like_count: (c.like_count || 0) + (isLiked ? -1 : 1),
    } : c));
  }

  async function handleReply(commentId: string) {
    if (!replyText.trim() || !userId) return;

    const { error } = await supabase
      .from('comment_replies')
      .insert({ comment_id: commentId, user_id: userId, text: replyText.trim() });

    if (error) Alert.alert('Error', error.message);
    else {
      setReplyText('');
      setReplyingTo(null);
      setShowReplySuggestions(false);
      fetchComments();
    }
  }

  function toggleReplies(commentId: string) {
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, showReplies: !c.showReplies } : c
    ));
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // ── Submit Report ─────────────────────────────────────────────────────
  async function handleSubmitReport() {
    if (!selectedReason) {
      Alert.alert('Please select a reason for your report');
      return;
    }

    if (!userId) {
      Alert.alert('You must be logged in to report a post');
      return;
    }

    const finalReason = selectedReason === 'Other'
      ? otherReason.trim() || 'Other'
      : selectedReason;

    setReportSubmitting(true);

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: userId,
        post_id: id,
        reported_user_id: post_user_id,
        reason: finalReason,
      });

    setReportSubmitting(false);

    if (error) {
      console.log('Report error:', error.message);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } else {
      setShowReportModal(false);
      setSelectedReason('');
      setOtherReason('');
      Alert.alert(
        '✅ Report Submitted',
        'Thank you for your report. We will review it shortly.',
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        {/* Top Row */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.topRowRight}>
            {/* ✅ Report Button - only shows if NOT your own post */}
            {userId !== post_user_id && (
              <TouchableOpacity
                onPress={() => setShowReportModal(true)}
                style={styles.reportButton}
              >
                <Text style={styles.reportButtonText}>🚩 Report</Text>
              </TouchableOpacity>
            )}

            {/* Edit Button - only shows if it IS your post */}
            {userId === post_user_id && (
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: '/editpost',
                  params: { id, image_url, title, description, category }
                })}
              >
                <Text style={styles.editText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Image source={{ uri: image_url }} style={styles.image} />
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {category ? <Text style={styles.category}>#{category}</Text> : null}

        <Text style={styles.commentsHeader}>Comments ({comments.length})</Text>

        {comments.length === 0 ? (
          <Text style={styles.empty}>No comments yet. Be the first!</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentContainer}>
              <View style={styles.comment}>
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/artist',
                    params: { user_id: comment.user_id, username: comment.username }
                  })}>
                  <View style={styles.commentAvatar}>
                    {comment.avatar_url ? (
                      <Image source={{ uri: comment.avatar_url }} style={styles.commentAvatarImage} />
                    ) : (
                      <Text style={styles.commentAvatarEmoji}>👤</Text>
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: '/artist',
                        params: { user_id: comment.user_id, username: comment.username }
                      })}>
                      <Text style={styles.commentUsername}>@{comment.username}</Text>
                    </TouchableOpacity>
                    <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
                  </View>
                  <CommentText text={comment.text} />
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.commentAction}
                      onPress={() => handleLikeComment(comment.id, comment.is_liked || false)}>
                      <Text style={styles.commentActionText}>
                        {comment.is_liked ? '❤️' : '🤍'} {comment.like_count || 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.commentAction}
                      onPress={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyText(`@${comment.username} `);
                      }}>
                      <Text style={styles.commentActionText}>💬 Reply</Text>
                    </TouchableOpacity>
                    {(comment.replies?.length || 0) > 0 && (
                      <TouchableOpacity
                        style={styles.commentAction}
                        onPress={() => toggleReplies(comment.id)}>
                        <Text style={styles.commentActionText}>
                          {comment.showReplies ? '▲ Hide' : `▼ ${comment.replies?.length} replies`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {replyingTo === comment.id && (
                    <View>
                      <View style={styles.replyInputRow}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Write a reply..."
                          value={replyText}
                          onChangeText={handleReplyChange}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.replyButton}
                          onPress={() => handleReply(comment.id)}
                        >
                          <Text style={styles.replyButtonText}>Post</Text>
                        </TouchableOpacity>
                      </View>
                      {showReplySuggestions && replySuggestions.length > 0 && (
                        <View style={styles.suggestions}>
                          {replySuggestions.map((user) => (
                            <TouchableOpacity
                              key={user.id}
                              style={styles.suggestionItem}
                              onPress={() => selectReplyTag(user)}>
                              <View style={styles.suggestionAvatar}>
                                {user.avatar_url ? (
                                  <Image source={{ uri: user.avatar_url }} style={styles.suggestionAvatarImage} />
                                ) : (
                                  <Text>👤</Text>
                                )}
                              </View>
                              <Text style={styles.suggestionUsername}>@{user.username}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {comment.showReplies && comment.replies && comment.replies.map((reply) => (
                <View key={reply.id} style={styles.reply}>
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/artist',
                      params: { user_id: reply.user_id, username: reply.username }
                    })}>
                    <View style={styles.replyAvatar}>
                      {reply.avatar_url ? (
                        <Image source={{ uri: reply.avatar_url }} style={styles.commentAvatarImage} />
                      ) : (
                        <Text style={styles.commentAvatarEmoji}>👤</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>@{reply.username}</Text>
                      <Text style={styles.commentTime}>{formatTime(reply.created_at)}</Text>
                    </View>
                    <CommentText text={reply.text} />
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.inputWrapper}>
        {showCommentSuggestions && commentSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {commentSuggestions.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.suggestionItem}
                onPress={() => selectCommentTag(user)}>
                <View style={styles.suggestionAvatar}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.suggestionAvatarImage} />
                  ) : (
                    <Text>👤</Text>
                  )}
                </View>
                <Text style={styles.suggestionUsername}>@{user.username}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment... type @ to tag"
            value={newComment}
            onChangeText={handleCommentChange}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleComment}>
            <Text style={styles.sendText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModal}>
            {/* Header */}
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>🚩 Report Post</Text>
              <TouchableOpacity onPress={() => {
                setShowReportModal(false);
                setSelectedReason('');
                setOtherReason('');
              }}>
                <Text style={{ fontSize: 22, color: '#888' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.reportModalSubtitle}>
              Why are you reporting this post?
            </Text>

            {/* Reason List */}
            <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason && styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View style={[
                    styles.reasonRadio,
                    selectedReason === reason && styles.reasonRadioSelected,
                  ]}>
                    {selectedReason === reason && (
                      <View style={styles.reasonRadioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected,
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Other text input */}
              {selectedReason === 'Other' && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Please describe the issue..."
                  value={otherReason}
                  onChangeText={setOtherReason}
                  multiline
                  numberOfLines={3}
                  autoFocus
                />
              )}
            </ScrollView>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.reportSubmitBtn,
                !selectedReason && styles.reportSubmitBtnDisabled,
              ]}
              onPress={handleSubmitReport}
              disabled={!selectedReason || reportSubmitting}
            >
              <Text style={styles.reportSubmitBtnText}>
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 16,
  },
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backText: {
    fontSize: 16,
    color: '#9b59b6',
    fontWeight: '600',
  },
  editText: {
    fontSize: 16,
    color: '#9b59b6',
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  reportButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    color: '#9b59b6',
    marginBottom: 16,
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
    color: '#333',
  },
  commentContainer: {
    marginBottom: 8,
  },
  comment: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  reply: {
    flexDirection: 'row',
    backgroundColor: '#f0e6ff',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    marginLeft: 20,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f953c6',
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f953c6',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  commentAvatarEmoji: {
    fontSize: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9b59b6',
  },
  commentTime: {
    fontSize: 11,
    color: '#aaa',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  mentionText: {
    color: '#9b59b6',
    fontWeight: '700',
  },
  commentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAction: {
    paddingVertical: 2,
  },
  commentActionText: {
    fontSize: 13,
    color: '#888',
  },
  replyInputRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  suggestionUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  empty: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 40,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#9b59b6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── Report Modal Styles ──
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reportModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  reportModalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  reasonsList: {
    maxHeight: 350,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  reasonItemSelected: {
    backgroundColor: '#f0e6ff',
    borderColor: '#9b59b6',
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonRadioSelected: {
    borderColor: '#9b59b6',
  },
  reasonRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9b59b6',
  },
  reasonText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#9b59b6',
    fontWeight: '600',
  },
  otherInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 8,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reportSubmitBtn: {
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  reportSubmitBtnDisabled: {
    backgroundColor: '#ffaaaa',
  },
  reportSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});