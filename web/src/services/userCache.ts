import { profileApi, type UserProfile } from './profile';

// In-memory cache for user profiles
const userCache = new Map<string, UserProfile>();
const pendingRequests = new Map<string, Promise<UserProfile | null>>();

export const userCacheService = {
  // Get user profile by ID
  getUser: async (userId: string): Promise<UserProfile | null> => {
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId)!;
    }

    // Check if request is already pending
    if (pendingRequests.has(userId)) {
      return pendingRequests.get(userId)!;
    }

    // Fetch from API
    const request = (async () => {
      try {
        const profile = await profileApi.getUserById(userId);
        userCache.set(userId, profile);
        return profile;
      } catch (error) {
        // If user doesn't exist, return placeholder
        const placeholderProfile: UserProfile = {
          id: userId,
          name: null,
          bio: null,
          picturePath: null,
          stats: {
            followers: 0,
            following: 0,
            posts: 0
          }
        };
        userCache.set(userId, placeholderProfile);
        return placeholderProfile;
      } finally {
        pendingRequests.delete(userId);
      }
    })();

    pendingRequests.set(userId, request);
    return request;
  },

  // Set current user profile in cache
  setCurrentUser: (profile: UserProfile) => {
    userCache.set(profile.id, profile);
  },

  // Clear cache
  clear: () => {
    userCache.clear();
    pendingRequests.clear();
  },

  // Get from cache only (no fetch)
  getCached: (userId: string): UserProfile | null => {
    return userCache.get(userId) || null;
  }
};
