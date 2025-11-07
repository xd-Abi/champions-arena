const API_BASE_URL = 'https://champions-arena.itsabi.com/api/tweets';

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

  return response.json();
}

export interface Tweet {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likes: string[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  tweetId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export const tweetApi = {
  // Get feed with pagination
  getFeed: (skip = 0, take = 20): Promise<Tweet[]> => {
    return fetchWithAuth(`${API_BASE_URL}?skip=${skip}&take=${take}`);
  },

  // Get single tweet
  getTweet: (tweetId: string): Promise<Tweet> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}`);
  },

  // Create tweet
  createTweet: (content: string): Promise<Tweet> => {
    return fetchWithAuth(`${API_BASE_URL}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Update tweet
  updateTweet: (tweetId: string, content: string): Promise<Tweet> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  // Delete tweet
  deleteTweet: (tweetId: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}`, {
      method: 'DELETE',
    });
  },

  // Like tweet
  likeTweet: (tweetId: string): Promise<Tweet> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}/like`, {
      method: 'POST',
    });
  },

  // Unlike tweet
  unlikeTweet: (tweetId: string): Promise<Tweet> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}/like`, {
      method: 'DELETE',
    });
  },

  // Get comments
  getComments: (tweetId: string): Promise<Comment[]> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}/comments`);
  },

  // Create comment
  createComment: (tweetId: string, content: string): Promise<Comment> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Delete comment
  deleteComment: (tweetId: string, commentId: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/${tweetId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },
};
