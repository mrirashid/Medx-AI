import api from './api';

// Types matching backend
export interface Notification {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  entity_type: 'user' | 'patient' | 'case' | 'document' | 'prediction' | 'recommendation';
  entity_id: string | null;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export interface UnreadCountResponse {
  unread: number;
}

const notificationService = {
  /**
   * Get all notifications for the current user
   * GET /api/v1/notifications/
   */
  getNotifications: async (page = 1, pageSize = 20): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>(
      `/v1/notifications/?page=${page}&page_size=${pageSize}`
    );
    return response.data;
  },

  /**
   * Get unread notification count
   * GET /api/v1/notifications/unread-count/
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<UnreadCountResponse>('/v1/notifications/unread-count/');
    return response.data.unread;
  },

  /**
   * Mark specific notifications as read
   * POST /api/v1/notifications/mark-read/
   */
  markAsRead: async (notificationIds: string[]): Promise<number> => {
    const response = await api.post<{ updated: number }>('/v1/notifications/mark-read/', {
      ids: notificationIds,
    });
    return response.data.updated;
  },

  /**
   * Mark all notifications as read
   * POST /api/v1/notifications/mark-all-read/
   */
  markAllAsRead: async (): Promise<number> => {
    const response = await api.post<{ updated: number }>('/v1/notifications/mark-all-read/');
    return response.data.updated;
  },

  /**
   * Delete a notification
   * DELETE /api/v1/notifications/{id}/
   */
  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/v1/notifications/${id}/`);
  },
};

export default notificationService;
