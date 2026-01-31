import api from './api';

// Types matching backend
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'superadmin';
  phone_number: string | null;
  profile_image?: string | null;
  profile_image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  two_factor_enabled?: boolean;
}

export interface UserListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export interface CreateUserData {
  email: string;
  full_name: string;
  password: string;
  role: 'doctor' | 'nurse' | 'superadmin';
  phone_number?: string;
  is_active?: boolean;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  phone_number?: string;
  is_active?: boolean;
  role?: 'doctor' | 'nurse' | 'superadmin';
}

export interface UserFilters {
  role?: 'doctor' | 'nurse' | 'superadmin';
  status?: 'active' | 'inactive';
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ArchivedUser {
  id: string;
  original_id: string;
  full_name: string;
  email: string;
  role: 'doctor' | 'nurse' | 'superadmin';
  archived_at: string;
  created_at: string;
}

const userService = {
  /**
   * Get all users with optional filters
   * GET /api/v1/users/
   */
  getUsers: async (filters?: UserFilters): Promise<UserListResponse> => {
    const params = new URLSearchParams();

    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const response = await api.get<UserListResponse>(`/v1/users/?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single user by ID
   * GET /api/v1/users/{id}/
   */
  getUser: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/v1/users/${id}/`);
    return response.data;
  },

  /**
   * Create a new user
   * POST /api/v1/users/
   */
  createUser: async (data: CreateUserData): Promise<User> => {
    const response = await api.post<User>('/v1/users/', data);
    return response.data;
  },

  /**
   * Update a user
   * PATCH /api/v1/users/{id}/
   */
  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await api.patch<User>(`/v1/users/${id}/`, data);
    return response.data;
  },

  /**
   * Delete/Archive a user (moves to UserArchive table)
   * DELETE /api/v1/users/{id}/
   */
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/v1/users/${id}/`);
  },

  /**
   * Get all archived (deleted) users
   * GET /api/v1/users/archived/
   */
  getArchivedUsers: async (): Promise<{
    count: number;
    results: ArchivedUser[];
  }> => {
    const response = await api.get<{ count: number; results: ArchivedUser[] }>('/v1/users/archived/');
    return response.data;
  },

  /**
   * Restore an archived user back to active users
   * POST /api/v1/users/{archive_id}/restore/
   */
  restoreUser: async (archiveId: string): Promise<{ status: string; id: string; email: string; message: string }> => {
    const response = await api.post<{ status: string; id: string; email: string; message: string }>(`/v1/users/${archiveId}/restore/`);
    return response.data;
  },

  /**
   * Permanently delete an archived user (cannot be undone)
   * DELETE /api/v1/users/{archive_id}/permanent-delete/
   */
  permanentDeleteUser: async (archiveId: string): Promise<{ status: string; message: string }> => {
    const response = await api.delete<{ status: string; message: string }>(`/v1/users/${archiveId}/permanent-delete/`);
    return response.data;
  },

  /**
   * Get list of doctors (for patient assignment)
   * GET /api/v1/users/doctors/
   */
  getDoctors: async (): Promise<Array<{ id: string; full_name: string; email: string }>> => {
    const response = await api.get<Array<{ id: string; full_name: string; email: string }>>('/v1/users/doctors/');
    return response.data;
  },

  /**
   * Get current user's profile
   * GET /api/v1/users/profile/
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/v1/users/profile/');
    return response.data;
  },

  /**
   * Update current user's profile
   * PATCH /api/v1/users/profile/update/
   */
  updateProfile: async (data: { full_name?: string; email?: string; phone_number?: string }): Promise<{ detail: string; user: User }> => {
    const response = await api.patch<{ detail: string; user: User }>('/v1/users/profile/update/', data);
    return response.data;
  },

  /**
   * Upload profile image
   * POST /api/v1/users/profile/upload-image/
   */
  uploadProfileImage: async (file: File): Promise<{ detail: string; user: User }> => {
    const formData = new FormData();
    formData.append('profile_image', file);
    const response = await api.post<{ detail: string; user: User }>('/v1/users/profile/upload-image/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Change password for current user
   * POST /api/v1/users/profile/change-password/
   */
  changePassword: async (data: { old_password: string; new_password: string; new_password_confirm: string }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/v1/users/profile/change-password/', data);
    return response.data;
  },

  /**
   * Send 2FA verification code to user's email
   * POST /api/v1/users/2fa/send-code/
   */
  send2FACode: async (email: string): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/v1/users/2fa/send-code/', { email });
    return response.data;
  },

  /**
   * Verify 2FA code
   * POST /api/v1/users/2fa/verify-code/
   */
  verify2FACode: async (email: string, code: string): Promise<{ detail: string; verified: boolean }> => {
    const response = await api.post<{ detail: string; verified: boolean }>('/v1/users/2fa/verify-code/', { email, code });
    return response.data;
  },

  /**
   * Check if 2FA is enabled for a user
   * POST /api/v1/users/2fa/check-enabled/
   */
  check2FAEnabled: async (email: string): Promise<{ two_factor_enabled: boolean }> => {
    const response = await api.post<{ two_factor_enabled: boolean }>('/v1/users/2fa/check-enabled/', { email });
    return response.data;
  },

  /**
   * Update 2FA setting for current user
   * PATCH /api/v1/users/profile/update/
   */
  update2FASetting: async (enabled: boolean): Promise<{ detail: string; user: User }> => {
    const response = await api.patch<{ detail: string; user: User }>('/v1/users/profile/update/', { two_factor_enabled: enabled });
    return response.data;
  },
};

export default userService;
