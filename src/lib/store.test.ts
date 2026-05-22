import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock React so useSyncExternalStore works outside components
vi.mock("react", () => {
  return {
    useState: (val: any) => [val, vi.fn()],
    useEffect: vi.fn(),
    useSyncExternalStore: (subscribe: any, getSnapshot: any, getServerSnapshot?: any) => {
      subscribe(() => {});
      if (getServerSnapshot) getServerSnapshot();
      return getSnapshot();
    },
  };
});

describe("store", () => {
  let store: typeof import("./store");

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    // Mock initial fetch requests made by init() to avoid warnings/errors
    (globalThis.fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: null }),
        });
      }
      if (url.includes("/api/auth/guest")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: "guest-token", user: { id: "g1", username: "guest" } }),
        });
      }
      if (url.includes("/api/posts") || url.includes("/api/comments") || url.includes("/api/user-data")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });

    store = await import("./store");
  });

  describe("Token Helpers", () => {
    it("setToken, getToken, clearToken", () => {
      expect(store.getToken()).toBeNull();
      store.setToken("my-token", "my-refresh-token");
      expect(store.getToken()).toBe("my-token");
      expect(localStorage.getItem("vibefail.auth_token")).toBe("my-token");
      expect(localStorage.getItem("vibefail.refresh_token")).toBe("my-refresh-token");
      store.clearToken();
      expect(store.getToken()).toBeNull();
    });

    it("getToken and ensureGuestSession handle undefined window", async () => {
      const originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      try {
        expect(store.getToken()).toBeNull();
        expect(await store.ensureGuestSession()).toBeNull();
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it("ensureGuestSession handles missing refreshToken", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "new-guest-token", user: { id: "g1", username: "guest" } }),
      });

      const token = await store.ensureGuestSession();
      expect(token).toBe("new-guest-token");
      expect(localStorage.getItem("vibefail.refresh_token")).toBeNull();
    });
  });

  describe("ensureGuestSession", () => {
    it("should return existing token if already set", async () => {
      store.setToken("existing-token");
      const token = await store.ensureGuestSession();
      expect(token).toBe("existing-token");
    });

    it("should create new guest session if no token is set", async () => {
      const mockResponse = { token: "new-guest-token", refreshToken: "rt", user: { id: "g1", username: "guest_1" } };
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const token = await store.ensureGuestSession();
      expect(token).toBe("new-guest-token");
      expect(store.getToken()).toBe("new-guest-token");
    });

    it("should throw error if guest session creation fails", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Failed to create guest" }),
      });

      await expect(store.ensureGuestSession()).rejects.toThrow("Failed to create guest");
    });
  });

  describe("API calls & Init", () => {
    it("init fetches posts, comments, and verifies session if token exists", async () => {
      store.setToken("existing-token");

      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/auth/session")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ user: { id: "u1", username: "user_1" } }),
          });
        }
        if (url.includes("/api/user-data")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              profile: { role: "admin", username: "user_1" },
              reactions: [{ postId: "p1", reactionKey: "cooked" }],
              votes: [{ postId: "p1", verdict: "ai_wrong" }],
            }),
          });
        }
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", created_at: "2026-05-22T00:00:00Z" }
            ],
          });
        }
        if (url.includes("/api/comments")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "c1", post_id: "p1", body: "C1", author: "c_author", created_at: "2026-05-22T00:00:00Z" }
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      // Trigger store.useStore() to initialize store
      store.useStore();
      // Wait for promises in init to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check if data is populated
      const state = store.useStore();
      expect(state.user).toEqual({ id: "u1", username: "user_1", role: "admin" });
      expect(state.posts.length).toBe(1);
      expect(state.comments.length).toBe(1);
      expect(state.posts[0].id).toBe("p1");
      expect(state.comments[0].id).toBe("c1");
    });

    it("init resets token and creates new guest if session check returns no user", async () => {
      store.setToken("invalid-token");

      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/auth/session")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ user: null }),
          });
        }
        if (url.includes("/api/auth/guest")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ token: "fallback-guest-token", user: { id: "g2", username: "guest_2" } }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.getToken()).toBe("fallback-guest-token");
    });

    it("init handles invalid theme JSON in localStorage", async () => {
      localStorage.setItem("vibefail.theme.v1", "invalid-json-{");
      store.useStore();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load theme during init:"),
        expect.any(Error)
      );
    });
  });

  describe("CRUD actions", () => {
    it("createPost creates post optimistically and makes api call", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const input = {
        title: "New Post Title",
        body: "New post body",
        tool: "cursor" as const,
        verdict: "still_broken" as const,
        plea: "innocent" as const,
      };

      const post = store.createPost(input);
      expect(post.title).toBe("New Post Title");

      const state = store.useStore();
      expect(state.posts.some((p) => p.id === post.id)).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("New Post Title"),
        })
      );
    });

    it("createPost handles API failure when apiCall returns an error object", async () => {
      // 1. Initialize store first so init() fetches are completed
      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));
      vi.clearAllMocks();

      // 2. Now set mock
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Database error" }),
      });

      store.createPost({
        title: "Failing Post",
        body: "body",
        tool: "cursor",
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save post to database:"),
        "Database error"
      );
    });

    it("createPost handles fetch rejection when network fails", async () => {
      // 1. Initialize store first
      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));
      vi.clearAllMocks();

      // 2. Now set mock
      store.setToken("mock-token");
      (globalThis.fetch as any).mockRejectedValueOnce(new Error("Network Error"));

      store.createPost({
        title: "Network Fail Post",
        body: "body",
        tool: "cursor",
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error creating post server side:"),
        expect.any(Error)
      );
    });

    it("addComment adds comment optimistically and makes api call", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const comment = await store.addComment("p1", "Nice code fail");
      expect(comment.body).toBe("Nice code fail");

      const state = store.useStore();
      expect(state.comments.some((c) => c.id === comment.id)).toBe(true);
    });

    it("addComment handles API failure", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Failed to add comment" }),
      });

      await store.addComment("p1", "Nice code fail");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalled();
    });

    it("addComment handles fetch rejection", async () => {
      store.clearToken();
      (globalThis.fetch as any).mockRejectedValue(new Error("Network Failure"));

      await store.addComment("p1", "Nice code fail");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalled();
    });

    it("toggleReaction optimistically reacts and rolls back on failure", async () => {
      // Setup initial posts in store (two posts to cover map conditional return)
      store.setToken("mock-token");
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", reactions: { cooked: 0 } },
              { id: "p2", title: "T2", body: "B2", verdict: "still_broken", reactions: { cooked: 0 } },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Mutate the reactions object of the first post to delete "cooked" key (covers || 0 fallback)
      const state = store.useStore();
      // @ts-ignore
      delete state.posts[0].reactions.cooked;

      // Mock failure for reaction post request
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Could not toggle reaction" }),
      });

      // Verify reaction is added, then rolled back on error
      await store.toggleReaction("p1", "cooked");
      expect(store.hasReacted("p1", "cooked")).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store.hasReacted("p1", "cooked")).toBe(false);
    });

    it("toggleReaction rollback when API response is falsy", async () => {
      // Setup initial posts in store
      store.setToken("mock-token");
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", reactions: { cooked: 0 } },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Mock falsy API response
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      // Toggle reaction. The catch block checks (res && "error" in res). If res is null, it should skip error block/rollback
      await store.toggleReaction("p1", "cooked");
      expect(store.hasReacted("p1", "cooked")).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store.hasReacted("p1", "cooked")).toBe(true);
    });

    it("toggleReaction rollback when toggling off active reaction", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/auth/session")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ user: { id: "u1", username: "user_1" } }),
          });
        }
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", reactions: { cooked: 1 } },
              { id: "p2", title: "T2", body: "B2", verdict: "still_broken", reactions: { cooked: 1 } },
            ],
          });
        }
        if (url.includes("/api/user-data")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ reactions: [{ postId: "p1", reactionKey: "cooked" }] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.hasReacted("p1", "cooked")).toBe(true);

      // Mock failure
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Server error" }),
      });

      // Toggle off "cooked" (active = true)
      await store.toggleReaction("p1", "cooked");

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should roll back to active = true (cooked = true)
      expect(store.hasReacted("p1", "cooked")).toBe(true);
    });

    it("toggleReaction handles existing reaction toggle off", async () => {
      store.setToken("mock-token");
      // Set up post with existing reaction
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/auth/session")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ user: { id: "u1", username: "user_1" } }),
          });
        }
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: "p1", title: "T1", body: "B1", verdict: "still_broken", reactions: { cooked: 1 } }],
          });
        }
        if (url.includes("/api/user-data")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ reactions: [{ postId: "p1", reactionKey: "cooked" }] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.hasReacted("p1", "cooked")).toBe(true);

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await store.toggleReaction("p1", "cooked");
      expect(store.hasReacted("p1", "cooked")).toBe(false);
    });

    it("setStatus sets status and makes API call", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // Create a post to populate the posts array for map/ternary coverage
      const post = store.createPost({
        title: "Status Test Post",
        body: "body",
        tool: "cursor",
      });

      // Set status to solved
      await store.setStatus(post.id, "solved");
      let state = store.useStore();
      let updatedPost = state.posts.find((p) => p.id === post.id);
      expect(updatedPost?.status).toBe("solved");
      expect(updatedPost?.verdict).toBe("solved");

      // Set status to broken
      await store.setStatus(post.id, "broken");
      state = store.useStore();
      updatedPost = state.posts.find((p) => p.id === post.id);
      expect(updatedPost?.status).toBe("broken");
      expect(updatedPost?.verdict).toBe("still_broken");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts/status"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ postId: post.id, status: "broken" }),
        })
      );
    });

    it("toggleHidden toggles hidden and makes API call", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", hidden: false },
              { id: "p2", title: "T2", body: "B2", verdict: "still_broken", hidden: false },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await store.toggleHidden("p1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts/hide"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ postId: "p1" }),
        })
      );

      // Early return check
      await store.toggleHidden("non-existent");
    });

    it("deletePost deletes post and comments, calls API", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // Seed a post and comment first
      const post = store.createPost({ title: "T", body: "B", tool: "cursor" });
      await store.addComment(post.id, "C");

      await store.deletePost(post.id);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts/delete"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ postId: post.id }),
        })
      );
    });

    it("updatePost updates post and calls API", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // Seed two posts
      const p1 = store.createPost({ title: "T1", body: "B1", tool: "cursor" });
      const p2 = store.createPost({ title: "T2", body: "B2", tool: "cursor" });

      await store.updatePost(p1.id, { title: "Updated Title" });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts/update"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ postId: p1.id, updates: { title: "Updated Title" } }),
        })
      );
    });

    it("updatePost throws error on API failure", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Updated failed" }),
      });

      await expect(store.updatePost("p1", { title: "Updated Title" })).rejects.toThrow("Updated failed");
    });

    it("deleteComment deletes comment and calls API", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // Seed two comments
      const post = store.createPost({ title: "T", body: "B", tool: "cursor" });
      const comment1 = await store.addComment(post.id, "C1");
      const comment2 = await store.addComment(post.id, "C2");

      await store.deleteComment(comment1.id);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/comments/delete"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ commentId: comment1.id }),
        })
      );
    });

    it("deleteComment throws error on API failure", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Delete failed" }),
      });

      await expect(store.deleteComment("c1")).rejects.toThrow("Delete failed");
    });

    it("reportContent reports post/comment and calls API", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await store.reportContent("post", "p1", "offensive");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/reports"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ targetType: "post", targetId: "p1", reason: "offensive" }),
        })
      );
    });

    it("reportContent throws error on API failure", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Report failed" }),
      });

      await expect(store.reportContent("post", "p1", "offensive")).rejects.toThrow("Report failed");
    });

    it("voteCourt votes and rolls back on failure", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: "p1", title: "T1", body: "B1", verdict: "still_broken", court: { ai_wrong: 0, skill_issue: 0 } }],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Vote failed" }),
      });

      store.voteCourt("p1", "ai_wrong");
      await new Promise((resolve) => setTimeout(resolve, 50));
      // should rollback to initial court votes
      const state = store.useStore();
      expect(state.posts[0].court.ai_wrong).toBe(0);
    });
  });

  describe("Helper methods", () => {
    it("timeAgo formats correctly", () => {
      const now = Date.now();
      expect(store.timeAgo(now - 10000)).toBe("10s ago");
      expect(store.timeAgo(now - 70000)).toBe("1m ago");
      expect(store.timeAgo(now - 4000000)).toBe("1h ago");
      expect(store.timeAgo(now - 100000000)).toBe("1d ago");
    });

    it("getAvatarUrl handles default and clean seed", () => {
      const url = store.getAvatarUrl("TestUser");
      expect(url).toContain("robohash.org/testuser.png");
    });

    it("toggleSavePost and isPostSaved", () => {
      expect(store.isPostSaved("p1")).toBe(false);
      store.toggleSavePost("p1");
      expect(store.isPostSaved("p1")).toBe(true);
      store.toggleSavePost("p1");
      expect(store.isPostSaved("p1")).toBe(false);
    });

    it("toggleLikeComment and isCommentLiked", () => {
      expect(store.isCommentLiked("c1")).toBe(false);
      store.toggleLikeComment("c1");
      expect(store.isCommentLiked("c1")).toBe(true);
      store.toggleLikeComment("c1");
      expect(store.isCommentLiked("c1")).toBe(false);
    });

    it("loadSavedPosts and loadLikedComments handle invalid JSON in localStorage", () => {
      localStorage.setItem("vibefail.saved_posts.v1", "invalid-json");
      localStorage.setItem("vibefail.liked_comments.v1", "invalid-json");

      expect(store.isPostSaved("p1")).toBe(false);
      expect(store.isCommentLiked("c1")).toBe(false);
    });

    it("getSecretReactionOfTheWeek returns a secret reaction and its key", () => {
      const reaction = store.getSecretReactionOfTheWeek();
      expect(reaction.emoji).toBeDefined();
      expect(reaction.key).toBeDefined();
      expect(reaction.expiresAt).toBeGreaterThan(Date.now());
    });

    it("getCourtRatio computes ratios correctly", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: "p1", title: "T1", body: "B1", verdict: "still_broken", court: { ai_wrong: 3, skill_issue: 1 } }],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.getCourtRatio("p1")).toEqual({ aiWrongPct: 75, skillIssuePct: 25, total: 4 });
      expect(store.getCourtRatio("non-existent")).toEqual({ aiWrongPct: 0, skillIssuePct: 0, total: 0 });
    });

    it("usePosts and useComments React hooks return sorted and filtered data", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", tool: "cursor", created_at: Date.now() - 10000, reactions: { cooked: 2 } },
              { id: "p2", title: "T2", tool: "claude", created_at: Date.now(), reactions: { cooked: 5 } },
            ],
          });
        }
        if (url.includes("/api/comments")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: "c1", post_id: "p1", body: "C1" }],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const postsTop = store.usePosts({ sort: "top" });
      expect(postsTop[0].id).toBe("p2");

      const postsHot = store.usePosts({ sort: "hot" });
      expect(postsHot[0].id).toBe("p2");

      const postsFiltered = store.usePosts({ filter: { tool: "cursor" } });
      expect(postsFiltered.length).toBe(1);
      expect(postsFiltered[0].id).toBe("p1");

      const comments = store.useComments("p1");
      expect(comments.length).toBe(1);
      expect(comments[0].id).toBe("c1");
    });
  });

  describe("Auth functions in store", () => {
    it("setAuthUser and logout", async () => {
      store.setAuthUser({ id: "u2", username: "user_2" });
      let state = store.useStore();
      expect(state.user).toEqual({ id: "u2", username: "user_2" });

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      store.logout();
      state = store.useStore();
      expect(state.user).toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/logout"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("loadUserReactionsAndVotes logs error on API rejection", async () => {
      // 1. Pre-initialize store
      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));
      vi.clearAllMocks();

      // 2. Set token
      store.setToken("mock-token");

      // 3. Mock fetch to reject for /api/user-data
      (globalThis.fetch as any).mockRejectedValueOnce(new Error("User Data Fetch Failed"));

      // 4. Call setAuthUser to trigger loadUserReactionsAndVotes
      store.setAuthUser({ id: "u2", username: "user_2" });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load user reactions and votes:"),
        expect.any(Error)
      );
    });

    it("setFeedTab and setTheme", () => {
      store.subscribe(() => {});
      store.setFeedTab("my-posts");
      let state = store.useStore();
      expect(state.feedTab).toBe("my-posts");

      store.setTheme("dark");
      state = store.useStore();
      expect(state.theme).toBe("dark");
    });

    it("persist handles theme save error", () => {
      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      try {
        store.setTheme("dark");
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed to save theme to localStorage:"),
          expect.any(Error)
        );
      } finally {
        setItemSpy.mockRestore();
      }
    });

    it("generateRandomUsername avoiding duplicate username check", () => {
      const username = store.generateRandomUsername();
      expect(username).toBeDefined();
    });

    it("randomHandle handles generation", () => {
      const handle = store.randomHandle();
      expect(handle).toMatch(/^anon-/);
    });

    it("safeUUID fallback when crypto.randomUUID is not available", () => {
      const originalCrypto = globalThis.crypto;
      // @ts-ignore
      delete (globalThis as any).crypto;

      try {
        const post = store.createPost({
          title: "Fallback UUID Post",
          body: "Testing safeUUID fallback code path",
          tool: "cursor",
          verdict: "still_broken",
          plea: "innocent",
        });
        expect(post.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      } finally {
        Object.defineProperty(globalThis, "crypto", {
          value: originalCrypto,
          writable: true,
          configurable: true,
        });
      }
    });

    it("randomHandle handles collisions and retries", () => {
      let calls = 0;
      const originalRandom = Math.random;
      Math.random = () => {
        calls++;
        if (calls <= 2) return 0.5; // generates duplicate
        return 0.6; // generates different
      };

      try {
        const post = store.createPost({
          title: "Test Collision",
          body: "body",
          tool: "cursor",
          author: "anon-87ffff",
        });

        const handle = store.randomHandle();
        expect(handle).toBeDefined();
        expect(handle).not.toBe("anon-87ffff");
      } finally {
        Math.random = originalRandom;
      }
    });

    it("voteCourt handles previous verdict updates and rollback on failure", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: "p1", title: "T1", body: "B1", verdict: "still_broken", court: { ai_wrong: 2, skill_issue: 1 } }],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      store.voteCourt("p1", "ai_wrong");
      await new Promise((resolve) => setTimeout(resolve, 50));

      let state = store.useStore();
      expect(state.posts[0].court.ai_wrong).toBe(3);
      expect(state.posts[0].court.skill_issue).toBe(1);

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Server error on second vote" }),
      });

      store.voteCourt("p1", "skill_issue");
      
      state = store.useStore();
      expect(state.posts[0].court.ai_wrong).toBe(2);
      expect(state.posts[0].court.skill_issue).toBe(2);

      await new Promise((resolve) => setTimeout(resolve, 50));

      state = store.useStore();
      expect(state.posts[0].court.ai_wrong).toBe(3);
      expect(state.posts[0].court.skill_issue).toBe(1);
    });

    it("voteCourt logs error when fetch rejects", async () => {
      store.clearToken();
      (globalThis.fetch as any).mockRejectedValue(new Error("Network Failure"));

      store.voteCourt("p1", "ai_wrong");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalled();
    });

    it("toggleReaction rollback handles previous reaction", async () => {
      store.setToken("mock-token");
      
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/auth/session")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ user: { id: "u1", username: "user_1" } }),
          });
        }
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: "p1", title: "T1", body: "B1", verdict: "still_broken", reactions: { relatable: 1, cooked: 0 } }],
          });
        }
        if (url.includes("/api/user-data")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ reactions: [{ postId: "p1", reactionKey: "relatable" }] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.hasReacted("p1", "relatable")).toBe(true);

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Server error toggling reaction" }),
      });

      await store.toggleReaction("p1", "cooked");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.hasReacted("p1", "relatable")).toBe(true);
      expect(store.hasReacted("p1", "cooked")).toBe(false);
    });

    it("toggleReaction logs error on fetch rejection", async () => {
      store.clearToken();
      (globalThis.fetch as any).mockRejectedValue(new Error("Network Failure"));

      await store.toggleReaction("p1", "cooked");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalled();
    });

    it("setStatus sets non-solved status and makes API call", async () => {
      store.setToken("mock-token");
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await store.setStatus("p1", "broken");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts/status"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ postId: "p1", status: "broken" }),
        })
      );
    });
  });

  describe("Polling", () => {
    it("polls for new posts and comments periodically", async () => {
      vi.useFakeTimers();
      
      // Re-import to start clean with fresh interval
      vi.resetModules();
      store = await import("./store");
      
      (globalThis.fetch as any).mockClear();
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      // Call store.useStore to invoke init() and set up interval
      store.useStore();

      // Advance timers by 31 seconds to trigger poll interval (30000 ms)
      await vi.advanceTimersByTimeAsync(31000);

      // fetch should have been called again for posts and comments
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts"),
        expect.objectContaining({ method: "GET" })
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/comments"),
        expect.objectContaining({ method: "GET" })
      );
      
      vi.useRealTimers();
    });
  });

  describe("Edge Cases and Fallbacks", () => {
    it("handles empty VITE_API_URL", async () => {
      vi.resetModules();
      vi.stubEnv("VITE_API_URL", "");
      const storeWithEmptyUrl = await import("./store");
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "t1" }),
      });
      await storeWithEmptyUrl.ensureGuestSession();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/auth/guest",
        expect.any(Object)
      );
    });

    it("subscribe cleanup deletes listener", () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      store.setFeedTab("following");
      expect(listener).toHaveBeenCalled();
      
      listener.mockClear();
      unsubscribe();
      store.setFeedTab("for-you");
      expect(listener).not.toHaveBeenCalled();
    });

    it("getAvatarUrl handles empty seed", () => {
      // @ts-ignore
      const url1 = store.getAvatarUrl(null);
      expect(url1).toContain("robohash.org/anon.png");

      // @ts-ignore
      const url2 = store.getAvatarUrl(undefined);
      expect(url2).toContain("robohash.org/anon.png");

      const url3 = store.getAvatarUrl("  ");
      expect(url3).toContain("robohash.org/.png");
    });

    it("getNextTuesdayUTC handles Tuesday fallback", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-19T12:00:00Z"));
      const r1 = store.getSecretReactionOfTheWeek();
      expect(new Date(r1.expiresAt).getUTCDay()).toBe(2);
      expect(new Date(r1.expiresAt).getUTCDate()).toBe(26);

      vi.setSystemTime(new Date("2026-05-20T12:00:00Z"));
      const r2 = store.getSecretReactionOfTheWeek();
      expect(new Date(r2.expiresAt).getUTCDay()).toBe(2);
      expect(new Date(r2.expiresAt).getUTCDate()).toBe(26);

      vi.useRealTimers();
    });

    it("mapPostFromDb and mapCommentFromDb fallback branches", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: "p1",
                title: "T1",
                body: "B1",
                tool: "cursor",
                vibe: "",
                verdict: "solved",
                plea: "",
                ai_defense: "defense_snake",
                meme_url: "meme_snake",
                crime_scene_image: "crime_snake",
                ai_defense_image: "defense_img_snake",
                author: "auth1",
                author_session_id: "s1",
                court: null,
                hidden: null,
                createdAt: "2026-05-22T00:00:00Z",
                status: "",
              },
              {
                id: "p2",
                title: "T2",
                body: "B2",
                tool: "claude",
                vibe: "vibe_coding",
                verdict: "still_broken",
                plea: "cooked",
                aiDefense: "defense_camel",
                memeUrl: "meme_camel",
                crimeSceneImage: "crime_camel",
                aiDefenseImage: "defense_img_camel",
                author: "auth2",
                authorSessionId: "s2",
                reactions: { cooked: 1 },
                court: { ai_wrong: 1, skill_issue: 0 },
                hidden: true,
                createdAt: 1779411448273,
                status: "broken",
              }
            ],
          });
        }
        if (url.includes("/api/comments")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: "c1",
                post_id: "p1",
                body: "C1",
                author: "ca1",
                createdAt: "2026-05-22T00:00:00Z",
              },
              {
                id: "c2",
                postId: "p2",
                body: "C2",
                author: "ca2",
                createdAt: 1779411448273,
              }
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = store.useStore();
      
      const p1 = state.posts.find(p => p.id === "p1")!;
      expect(p1.vibe).toBeUndefined();
      expect(p1.plea).toBeUndefined();
      expect(p1.aiDefense).toBe("defense_snake");
      expect(p1.memeUrl).toBe("meme_snake");
      expect(p1.crimeSceneImage).toBe("crime_snake");
      expect(p1.aiDefenseImage).toBe("defense_img_snake");
      expect(p1.authorSessionId).toBe("s1");
      expect(p1.reactions).toEqual({});
      expect(p1.court).toEqual({ ai_wrong: 0, skill_issue: 0 });
      expect(p1.hidden).toBe(false);
      expect(p1.status).toBe("solved");

      const p2 = state.posts.find(p => p.id === "p2")!;
      expect(p2.vibe).toBe("vibe_coding");
      expect(p2.plea).toBe("cooked");
      expect(p2.aiDefense).toBe("defense_camel");
      expect(p2.memeUrl).toBe("meme_camel");
      expect(p2.crimeSceneImage).toBe("crime_camel");
      expect(p2.aiDefenseImage).toBe("defense_img_camel");
      expect(p2.authorSessionId).toBe("s2");
      expect(p2.reactions).toEqual({ cooked: 1 });
      expect(p2.court).toEqual({ ai_wrong: 1, skill_issue: 0 });
      expect(p2.hidden).toBe(true);
      expect(p2.status).toBe("broken");

      const c1 = state.comments.find(c => c.id === "c1")!;
      expect(c1.postId).toBe("p1");

      const c2 = state.comments.find(c => c.id === "c2")!;
      expect(c2.postId).toBe("p2");
    });

    it("voteCourt fallback/edge cases", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", court: null },
              { id: "p2", title: "T2", body: "B2", verdict: "still_broken", court: { ai_wrong: 1 } },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      store.voteCourt("p1", "ai_wrong");
      let state = store.useStore();
      expect(state.posts.find(p => p.id === "p1")!.court.ai_wrong).toBe(1);

      (globalThis.fetch as any).mockClear();
      store.voteCourt("p1", "ai_wrong");
      expect(globalThis.fetch).not.toHaveBeenCalled();

      // Test court[verdict] || 0 fallback by setting p.court to {} (empty object) during rollback
      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ error: "Vote failed" }) });
      store.voteCourt("p2", "ai_wrong");
      
      let currentState = store.useStore();
      let currentPost = currentState.posts.find(p => p.id === "p2")!;
      // @ts-ignore
      currentPost.court = {}; // forces court[verdict] to be undefined

      await new Promise((resolve) => setTimeout(resolve, 50));

      state = store.useStore();
      expect(state.posts.find(p => p.id === "p2")!.court.ai_wrong).toBe(0);

      // Test p.court || ... fallback by deleting court entirely during rollback
      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ error: "Vote failed" }) });
      store.voteCourt("p1", "skill_issue");
      
      currentState = store.useStore();
      currentPost = currentState.posts.find(p => p.id === "p1")!;
      // @ts-ignore
      delete currentPost.court; // forces p.court to be undefined

      await new Promise((resolve) => setTimeout(resolve, 50));
      state = store.useStore();
      expect(state.posts.find(p => p.id === "p1")!.court).toEqual({ ai_wrong: 1, skill_issue: 0 });
    });

    it("toggleReaction rollback fallback/edge cases", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", reactions: {} },
              { id: "p2", title: "T2", body: "B2", verdict: "still_broken", reactions: { cooked: 1 } },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ error: "Reaction failed" }) });
      await store.toggleReaction("p1", "cooked");
      await new Promise((resolve) => setTimeout(resolve, 50));

      let state = store.useStore();
      expect(state.posts.find(p => p.id === "p1")!.reactions.cooked).toBe(0);

      store.setToken("mock-token");
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/user-data")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              reactions: [
                { postId: "p2", reactionKey: "cooked" }, // different post reaction (for line 514 false path)
                { postId: "p1", reactionKey: "cooked" }, // same post reaction (previous reaction for p1)
              ],
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });
      store.setAuthUser({ id: "u2" });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.hasReacted("p2", "cooked")).toBe(true);
      expect(store.hasReacted("p1", "cooked")).toBe(true);

      // Now we call toggleReaction on p1 with reaction "relatable".
      // This will check "p2:cooked" (line 514 false path), find "p1:cooked" (previousReaction = "cooked"),
      // and do optimistic update: reactions["cooked"] || 0 fallback (line 527) because p1.reactions.cooked is undefined.
      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ error: "Reaction failed" }) });
      store.toggleReaction("p1", "relatable");

      // Immediately get current state after optimistic update, and delete reaction keys to force rollback fallbacks
      const currentState = store.useStore();
      const currentPost = currentState.posts.find(p => p.id === "p1")!;
      // @ts-ignore
      delete currentPost.reactions.relatable; // forces reactions[r] || 0 to be undefined during rollback (line 554)
      // @ts-ignore
      delete currentPost.reactions.cooked; // forces reactions[previousReaction] || 0 to be undefined during rollback (line 557)

      await new Promise((resolve) => setTimeout(resolve, 50));

      state = store.useStore();
      const p1 = state.posts.find(p => p.id === "p1")!;
      expect(p1.reactions.cooked).toBe(1);
      expect(p1.reactions.relatable).toBe(0);
      expect(store.hasReacted("p1", "cooked")).toBe(true);
      expect(store.hasReacted("p1", "relatable")).toBe(false);
    });

    it("addComment adds comment with random handle if user is null", async () => {
      store.logout();
      expect(store.useStore().user).toBeNull();

      const comment = await store.addComment("p1", "Anonymous comment body");
      expect(comment.author).toMatch(/^anon-/);
    });

    it("logout handles API failure silently", async () => {
      // Initialize store first so init() fetches are completed
      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));
      vi.clearAllMocks();

      (globalThis.fetch as any).mockRejectedValueOnce(new Error("Logout API Failed"));
      expect(() => store.logout()).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it("setAuthUser handles null user", () => {
      store.setAuthUser(null);
      expect(store.useStore().user).toBeNull();
    });

    it("persist handles undefined window", () => {
      const originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;
      try {
        store.setTheme("dark");
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it("addComment uses username when user is logged in", async () => {
      store.setAuthUser({ id: "u1", username: "john_doe" });
      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const comment = await store.addComment("p1", "hello");
      expect(comment.author).toBe("john_doe");
    });

    it("voteCourt optimistic update fallbacks for lines 756 and 759", async () => {
      // Setup posts and user votes
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken", court: { ai_wrong: 1 } },
            ],
          });
        }
        if (url.includes("/api/user-data")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              votes: [{ postId: "p1", verdict: "ai_wrong" }],
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.setToken("mock-token");
      store.setAuthUser({ id: "u1" });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Test line 756: p.court || ... fallback by deleting p.court before voting
      let state = store.useStore();
      const p1 = state.posts.find(p => p.id === "p1")!;
      // @ts-ignore
      delete p1.court;

      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      store.voteCourt("p1", "skill_issue");
      
      // Test line 759: court[previousVerdict] || 0 fallback
      // Reset post to have empty court and previous vote "ai_wrong"
      state = store.useStore();
      const p1Reset = state.posts.find(p => p.id === "p1")!;
      // @ts-ignore
      p1Reset.court = {};
      
      (globalThis.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      store.voteCourt("p1", "skill_issue");
    });

    it("polling interval handles non-arrays for posts and comments", async () => {
      vi.useFakeTimers();
      
      vi.resetModules();
      store = await import("./store");
      
      (globalThis.fetch as any).mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ error: "Not an array" }),
        });
      });

      store.useStore();

      // Trigger interval poll
      await vi.advanceTimersByTimeAsync(31000);
      
      vi.useRealTimers();
    });

    it("generateRandomUsername terminates after 100 attempts on collision", () => {
      const originalRandom = Math.random;
      Math.random = () => 0.5;

      try {
        const expectedName = store.generateRandomUsername();
        
        (globalThis.fetch as any).mockImplementation((url: string) => {
          if (url.includes("/api/posts")) {
            return Promise.resolve({
              ok: true,
              json: async () => [{ id: "p1", title: "T1", author: expectedName }],
            });
          }
          return Promise.resolve({ ok: true, json: async () => [] });
        });
        
        store.useStore();
        
        const name = store.generateRandomUsername();
        expect(name).toBe(expectedName);
      } finally {
        Math.random = originalRandom;
      }
    });

    it("generateRandomUsername handles comment author collision", async () => {
      const originalRandom = Math.random;
      let calls = 0;
      Math.random = () => {
        calls++;
        if (calls <= 2) return 0.1;
        if (calls === 3) return 0.9;
        return 0.8;
      };

      try {
        const nameA = store.generateRandomUsername();
        
        (globalThis.fetch as any).mockImplementation((url: string) => {
          if (url.includes("/api/comments")) {
            return Promise.resolve({
              ok: true,
              json: async () => [{ id: "c1", postId: "p1", author: nameA, body: "hello" }],
            });
          }
          return Promise.resolve({ ok: true, json: async () => [] });
        });
        
        store.useStore();
        await new Promise((resolve) => setTimeout(resolve, 50));
        
        calls = 0;
        const name = store.generateRandomUsername();
        expect(name).not.toBe(nameA);
      } finally {
        Math.random = originalRandom;
      }
    });

    it("init and polling handle non-array posts or comments data", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ error: "Failed to fetch posts" }),
          });
        }
        if (url.includes("/api/comments")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ error: "Failed to fetch comments" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      const state = store.useStore();
      expect(state.posts).toEqual([]);
      expect(state.comments).toEqual([]);
    });

    it("loadUserReactionsAndVotes handles null user, missing profile properties, and missing reactions/votes list", async () => {
      // Initialize store first so init() fetches are completed
      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));
      vi.clearAllMocks();

      store.setToken("mock-token");

      let resolveUserData: any;
      const userDataPromise = new Promise((resolve) => {
        resolveUserData = resolve;
      });
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/user-data")) {
          return userDataPromise.then(() => ({
            ok: true,
            json: async () => ({
              profile: { role: "", username: "" },
              reactions: null,
              votes: null,
            }),
          }));
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.setAuthUser({ id: "u1", username: "user_1" });
      
      store.logout();
      expect(store.useStore().user).toBeNull();

      resolveUserData();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = store.useStore();
      expect(state.user).toEqual({
        role: "user",
        username: undefined,
      });
    });

    it("loadSavedPosts and loadLikedComments handle undefined window", () => {
      const originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      try {
        expect(store.isPostSaved("p1")).toBe(false);
        expect(store.isCommentLiked("c1")).toBe(false);
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it("setStatus sets solved status, maps correctly, and handles other posts in store", async () => {
      (globalThis.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/api/posts")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "p1", title: "T1", body: "B1", verdict: "still_broken" },
              { id: "p2", title: "T2", body: "B2", verdict: "still_broken" },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      store.useStore();
      await new Promise((resolve) => setTimeout(resolve, 50));

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await store.setStatus("p1", "solved");

      const state = store.useStore();
      const p1 = state.posts.find(p => p.id === "p1")!;
      expect(p1.status).toBe("solved");
      expect(p1.verdict).toBe("solved");

      const p2 = state.posts.find(p => p.id === "p2")!;
      expect(p2.status).toBe("broken");
      expect(p2.verdict).toBe("still_broken");
    });
  });
});
