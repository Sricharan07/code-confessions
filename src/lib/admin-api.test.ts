import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  HttpError,
  fetchAdminData,
  grantModerator,
  toggleUserRole,
  dismissReport,
  deleteReportedContent,
  togglePostHidden,
  deletePostAdmin,
  adminLogin,
} from "./admin-api";

describe("admin-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const token = "mock-admin-token";

  it("should handle HTTP error when request fails with error field", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad Request" }),
    });

    await expect(fetchAdminData(token)).rejects.toThrow(HttpError);
    await expect(fetchAdminData(token)).rejects.toThrow("Bad Request");
  });

  it("should handle HTTP error when request fails with message field", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Something went wrong" }),
    });

    await expect(fetchAdminData(token)).rejects.toThrow("Something went wrong");
  });

  it("should handle HTTP error when request fails with neither error nor message", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    });

    await expect(fetchAdminData(token)).rejects.toThrow("HTTP 400");
  });

  it("should handle HTTP error when errorJson is null", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => null,
    });

    await expect(fetchAdminData(token)).rejects.toThrow("HTTP 400");
  });

  it("should handle HTTP error with fallback message when response is not JSON", async () => {
    // Mock fetch returning non-ok non-JSON response
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("Not JSON");
      },
    });

    try {
      await fetchAdminData(token);
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(500);
      expect(err.message).toBe("HTTP 500");
    }
  });

  describe("admin-api environment fallback", () => {
    it("should fall back to empty string if VITE_API_URL is not set", async () => {
      vi.resetModules();
      vi.stubEnv("VITE_API_URL", "");
      const { fetchAdminData: dynamicFetchAdminData } = await import("./admin-api");
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      await dynamicFetchAdminData("token");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/data", expect.any(Object));
    });
  });

  it("fetchAdminData fetches admin data", async () => {
    const mockData = { profiles: [], reports: [], posts: [], comments: [] };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const res = await fetchAdminData(token);
    expect(res).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/data"),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${token}` },
      })
    );
  });

  it("grantModerator makes correct API call", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await grantModerator(token, "user-123");
    expect(res).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/action"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "grantModerator", profileId: "user-123" }),
      })
    );
  });

  it("toggleUserRole makes correct API call", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, newRole: "admin" }),
    });

    const res = await toggleUserRole(token, "user-123", "user");
    expect(res).toEqual({ ok: true, newRole: "admin" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/action"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "toggleRole", profileId: "user-123", role: "user" }),
      })
    );
  });

  it("dismissReport makes correct API call", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await dismissReport(token, "report-123");
    expect(res).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/action"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "dismissReport", targetId: "report-123" }),
      })
    );
  });

  it("deleteReportedContent makes correct API call", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await deleteReportedContent(token, "post-123", "post");
    expect(res).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/action"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "deleteReportedContent", targetId: "post-123", targetType: "post" }),
      })
    );
  });

  it("togglePostHidden makes correct API call", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, hidden: true }),
    });

    const res = await togglePostHidden(token, "post-123");
    expect(res).toEqual({ ok: true, hidden: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/action"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "toggleHidden", targetId: "post-123" }),
      })
    );
  });

  it("deletePostAdmin makes correct API call", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await deletePostAdmin(token, "post-123");
    expect(res).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/action"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "deletePost", targetId: "post-123" }),
      })
    );
  });

  it("adminLogin makes correct API call", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "some-token" }),
    });

    const res = await adminLogin("admin", "password123");
    expect(res).toEqual({ token: "some-token" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "password123" }),
      })
    );
  });
});
