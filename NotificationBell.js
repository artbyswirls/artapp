// ==============================================
// NotificationBell.js
// The bell icon + notification dropdown
// ==============================================

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    deleteNotification,
    fetchNotifications,
    fetchUnreadCount,
    markAllAsRead,
    markAsRead,
    subscribeToNotifications,
} from './notificationService';

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Load notifications when component mounts
  useEffect(() => {
    if (!userId) return;

    loadNotifications();
    loadUnreadCount();

    // Listen for new notifications in real-time
    const unsubscribe = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  async function loadNotifications() {
    const data = await fetchNotifications(userId);
    setNotifications(data);
  }

  async function loadUnreadCount() {
    const count = await fetchUnreadCount(userId);
    setUnreadCount(count);
  }

  async function handleTapNotification(id) {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function handleDelete(id) {
    const wasUnread = notifications.find((n) => n.id === id)?.is_read === false;
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }

  function openModal() {
    setModalVisible(true);
    loadNotifications();
    loadUnreadCount();
  }

  // --- UPDATED ICONS for like, comment, follow ---
  function getIcon(type) {
    switch (type) {
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      case 'follow':
        return 'person-add';
      default:
        return 'notifications';
    }
  }

  function getIconColor(type) {
    switch (type) {
      case 'like':
        return '#FF4444';
      case 'comment':
        return '#4A90D9';
      case 'follow':
        return '#9B59B6';
      default:
        return '#888';
    }
  }

  function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return date.toLocaleDateString();
  }

  function renderNotification({ item }) {
    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.is_read && styles.unread]}
        onPress={() => handleTapNotification(item.id)}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: getIconColor(item.type) + '20' },
          ]}
        >
          <Ionicons
            name={getIcon(item.type)}
            size={22}
            color={getIconColor(item.type)}
          />
        </View>

        {/* Text */}
        <View style={styles.notifContent}>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>{getTimeAgo(item.created_at)}</Text>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteBtn}
        >
          <Ionicons name="close" size={18} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      {/* BELL ICON */}
      <TouchableOpacity onPress={openModal} style={styles.bellButton}>
        <Ionicons name="notifications-outline" size={26} color="#333" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* NOTIFICATION MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <View style={styles.headerRight}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            {/* List */}
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="notifications-off-outline"
                  size={60}
                  color="#ccc"
                />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderNotification}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  markAllText: {
    color: '#4A90D9',
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unread: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90D9',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: '#999',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
});