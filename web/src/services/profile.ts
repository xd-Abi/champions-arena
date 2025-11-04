const API_BASE_URL = 'https://champions-arena.itsabi.com/api/profile';

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getCookie('ca-auth');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  picturePath: string | null;
  stats: {
    followers: number;
    following: number;
    posts: number;
  };
}

export interface UpdateProfileDto {
  name?: string;
  bio?: string;
}

export const profileApi = {
  // Get current user profile
  getMe: (): Promise<UserProfile> => {
    return fetchWithAuth(`${API_BASE_URL}/me`);
  },

  // Get user profile by ID
  getUserById: (userId: string): Promise<UserProfile> => {
    return fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
  },

  // Update current user profile
  updateMe: (data: UpdateProfileDto): Promise<UserProfile> => {
    return fetchWithAuth(`${API_BASE_URL}/me`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Upload profile picture
  uploadPicture: async (file: File): Promise<UserProfile> => {
    const token = getCookie('ca-auth');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/me/picture`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete profile picture
  deletePicture: (): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/me/picture`, {
      method: 'DELETE',
    });
  },
};
