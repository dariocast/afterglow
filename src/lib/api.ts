export interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarColor?: string | null;
  createdAt?: string | Date;
}

export interface UserProfile extends User {
  isFollowing: boolean | null;
  activeMoments: Post[];
}

export interface ProfileUpdateInput {
  bio?: string;
  displayName?: string;
  avatarColor?: string;
}

export type ReactionKind = 'glow' | 'warm' | 'thought';

export interface ReactionTally {
  glow: number;
  warm: number;
  thought: number;
}

export interface Reply {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string | Date;
  author: User;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  lifetimeHours: number;
  createdAt: string | Date;
  expiresAt: string | Date;
  author: User;
  reactions: ReactionTally;
  userReaction: ReactionKind | null;
  replies: Reply[];
}

export type FeedFilter = 'all' | 'following' | 'ending' | 'mine';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.error) {
        errorMessage = data.error;
      }
    } catch {
      // ignored
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Posts
  async getPosts(filter: FeedFilter = 'all'): Promise<Post[]> {
    return request<Post[]>(`/api/posts?filter=${filter}`);
  },

  async createPost(content: string, lifetimeHours: number): Promise<Post> {
    return request<Post>('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content, lifetimeHours }),
    });
  },

  async reactToPost(postId: string, kind: ReactionKind): Promise<{
    success: boolean;
    reaction: { id: string; kind: string } | null;
    reactions: ReactionTally;
    userReaction: ReactionKind | null;
  }> {
    return request<{
      success: boolean;
      reaction: { id: string; kind: string } | null;
      reactions: ReactionTally;
      userReaction: ReactionKind | null;
    }>(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ kind }),
    });
  },

  async deletePost(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/posts/${id}`, {
      method: 'DELETE',
    });
  },

  async addReply(postId: string, content: string): Promise<Reply> {
    return request<Reply>(`/api/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Auth
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await request<{ user: User | null }>('/api/auth/me');
      return res.user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    await request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getRegisterOptions(username: string, displayName?: string) {
    return request<any>('/api/auth/register-options', {
      method: 'POST',
      body: JSON.stringify({ username, displayName }),
    });
  },

  async verifyRegistration(response: any) {
    return request<{ verified: boolean; user: User }>('/api/auth/register-verify', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  },

  async getAuthOptions(username?: string) {
    return request<any>('/api/auth/login-options', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async verifyAuth(response: any) {
    return request<{ verified: boolean; user: User }>('/api/auth/login-verify', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  },

  // Users & Social Graph
  async fetchUserProfile(username: string): Promise<UserProfile> {
    return request<UserProfile>(`/api/users/${encodeURIComponent(username)}`);
  },

  async updateProfile(data: ProfileUpdateInput): Promise<User> {
    return request<User>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async followUser(userId: string): Promise<{ success: boolean; isFollowing: boolean }> {
    return request<{ success: boolean; isFollowing: boolean }>(
      `/api/users/${encodeURIComponent(userId)}/follow`,
      {
        method: 'POST',
      }
    );
  },

  async unfollowUser(userId: string): Promise<{ success: boolean; isFollowing: boolean }> {
    return request<{ success: boolean; isFollowing: boolean }>(
      `/api/users/${encodeURIComponent(userId)}/follow`,
      {
        method: 'DELETE',
      }
    );
  },
};
