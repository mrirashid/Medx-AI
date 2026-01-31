import api, { tokenManager } from './api';

// Types matching backend
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'superadmin';
  phone_number: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Map backend role to frontend role
export const mapRole = (backendRole: string): 'doctor' | 'nurse' | 'admin' => {
  if (backendRole === 'superadmin') return 'admin';
  return backendRole as 'doctor' | 'nurse';
};

// Map frontend role to backend role
export const mapRoleToBackend = (frontendRole: string): string => {
  if (frontendRole === 'admin' || frontendRole === 'Admin') return 'superadmin';
  return frontendRole.toLowerCase();
};

const authService = {
  /**
   * Login with email and password
   * POST /api/login/
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/login/', credentials);
    
    // Store tokens
    tokenManager.setTokens(response.data.access, response.data.refresh);
    
    return response.data;
  },

  /**
   * Get current user profile
   * GET /api/me/
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/me/');
    return response.data;
  },

  /**
   * Logout - clear tokens
   * POST /api/logout/
   */
  logout: async (): Promise<void> => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await api.post('/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      // Ignore logout errors - we'll clear tokens anyway
      console.warn('Logout request failed:', error);
    } finally {
      tokenManager.clearTokens();
    }
  },

  /**
   * Refresh access token
   * POST /api/login/refresh/
   */
  refreshToken: async (): Promise<string> => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await api.post<{ access: string }>('/login/refresh/', {
      refresh: refreshToken,
    });
    
    localStorage.setItem('access_token', response.data.access);
    return response.data.access;
  },

  /**
   * Check if user is authenticated (has valid tokens)
   */
  isAuthenticated: (): boolean => {
    return !!tokenManager.getAccessToken();
  },

  /**
   * Forgot password - request reset email
   * POST /api/v1/users/forgot-password/
   */
  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/v1/users/forgot-password/', { email });
  },

  /**
   * Reset password with token
   * POST /api/v1/users/reset-password/
   */
  resetPassword: async (data: {
    email: string;
    token: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> => {
    await api.post('/v1/users/reset-password/', data);
  },

  /**
   * Change password (authenticated user)
   * POST /api/v1/users/profile/change-password/
   */
  changePassword: async (data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> => {
    await api.post('/v1/users/profile/change-password/', data);
  },

  /**
   * Update profile
   * PATCH /api/v1/users/profile/update/
   */
  updateProfile: async (data: {
    full_name?: string;
    email?: string;
    phone_number?: string;
  }): Promise<UserProfile> => {
    const response = await api.patch<{ detail: string; user: UserProfile }>(
      '/v1/users/profile/update/',
      data
    );
    return response.data.user;
  },

  /**
   * Upload profile image
   * POST /api/v1/users/profile/upload-image/
   */
  uploadProfileImage: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('profile_image', file);
    
    const response = await api.post<{ detail: string; user: UserProfile }>(
      '/v1/users/profile/upload-image/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.user;
  },
};

export default authService;
