export interface User {
  id: string;
  username: string;
  displayName: string;
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

export type FeedFilter = 'all' | 'ending' | 'mine';

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

  async reactToPost(postId: string, kind: ReactionKind): Promise<{ reactions: ReactionTally; userReaction: ReactionKind | null }> {
    return request<{ reactions: ReactionTally; userReaction: ReactionKind | null }>(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ kind }),
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
    return request<any>('/api/auth/auth-options', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async verifyAuth(response: any) {
    return request<{ verified: boolean; user: User }>('/api/auth/auth-verify', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  },
};
