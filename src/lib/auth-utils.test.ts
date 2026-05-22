import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateRandomUsername,
  getCuratedUsernameSuggestions,
  loginWithCredentials,
  signupWithCredentials,
  loginAsGuest,
} from "./auth-utils";
import { setToken, setAuthUser } from "./store";

// Mock store module functions
vi.mock("./store", () => ({
  setAuthUser: vi.fn(),
  setToken: vi.fn(),
  apiCall: vi.fn(),
}));

describe("auth-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateRandomUsername", () => {
    it("should generate a random username matching the pattern", () => {
      const username = generateRandomUsername();
      expect(username).toMatch(/^[A-Za-z]+_[A-Za-z]+_\d{6}$/);
    });
  });

  describe("getCuratedUsernameSuggestions", () => {
    it("should fetch usernames from LLM API if response is ok and returns array", async () => {
      const mockNames = ["Llm_User_111111", "Llm_User_222222", "Llm_User_333333"];
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNames,
      });

      const result = await getCuratedUsernameSuggestions(3);
      expect(result).toEqual(mockNames);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/usernames")
      );
    });

    it("should fallback to generating random usernames if fetch rejects", async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new Error("Network Error"));

      const result = await getCuratedUsernameSuggestions(3);
      expect(result.length).toBe(3);
      result.forEach((username) => {
        expect(username).toMatch(/^[A-Za-z]+_[A-Za-z]+_\d{6}$/);
      });
    });

    it("should fallback to generating random usernames if fetch response is not ok", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Internal Error" }),
      });

      const result = await getCuratedUsernameSuggestions(3);
      expect(result.length).toBe(3);
    });

    it("should fallback to generating random usernames if fetch does not return an array", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "data" }),
      });

      const result = await getCuratedUsernameSuggestions(3);
      expect(result.length).toBe(3);
    });

    it("should fallback to generating random usernames if fetch returns empty array", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await getCuratedUsernameSuggestions(3);
      expect(result.length).toBe(3);
    });

    it("should skip duplicates when generating random username suggestions", async () => {
      let callCount = 0;
      const mockRandom = vi.spyOn(Math, "random").mockImplementation(() => {
        callCount++;
        if (callCount <= 6) {
          return 0.1;
        }
        if (callCount <= 9) {
          return 0.2;
        }
        return 0.3;
      });

      try {
        const result = await getCuratedUsernameSuggestions(3);
        expect(result.length).toBe(3);
        expect(result[0]).not.toBe(result[1]);
        expect(result[1]).not.toBe(result[2]);
      } finally {
        mockRandom.mockRestore();
      }
    });
  });

  describe("loginWithCredentials", () => {
    it("should call login endpoint and store token/user on success", async () => {
      const mockUser = { id: "1", username: "user1" };
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "t1", refreshToken: "rt1", user: mockUser }),
      });

      const result = await loginWithCredentials("user1", "pass123");
      expect(result).toEqual(mockUser);
      expect(setToken).toHaveBeenCalledWith("t1", "rt1");
      expect(setAuthUser).toHaveBeenCalledWith(mockUser);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ username: "user1", password: "pass123" }),
        })
      );
    });

    it("should throw error if response is not ok", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid password" }),
      });

      await expect(loginWithCredentials("user1", "wrong")).rejects.toThrow("Invalid password");
      expect(setToken).not.toHaveBeenCalled();
      expect(setAuthUser).not.toHaveBeenCalled();
    });

    it("should throw default error if response is not ok and has no error field", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(loginWithCredentials("user1", "wrong")).rejects.toThrow("Login failed");
    });
  });

  describe("signupWithCredentials", () => {
    it("should call signup endpoint and store token/user on success", async () => {
      const mockUser = { id: "1", username: "user1" };
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "t1", refreshToken: "rt1", user: mockUser }),
      });

      const result = await signupWithCredentials("user1", "pass123");
      expect(result).toEqual(mockUser);
      expect(setToken).toHaveBeenCalledWith("t1", "rt1");
      expect(setAuthUser).toHaveBeenCalledWith(mockUser);
    });

    it("should throw error if signup fails", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Username taken" }),
      });

      await expect(signupWithCredentials("user1", "pass123")).rejects.toThrow("Username taken");
    });

    it("should throw default error if signup response is not ok and has no error field", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(signupWithCredentials("user1", "pass123")).rejects.toThrow("Signup failed");
    });
  });

  describe("loginAsGuest", () => {
    it("should call guest endpoint and store token/user on success", async () => {
      const mockUser = { id: "guest1", username: "guest_123" };
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "t1", refreshToken: "rt1", user: mockUser }),
      });

      const result = await loginAsGuest();
      expect(result).toEqual(mockUser);
      expect(setToken).toHaveBeenCalledWith("t1", "rt1");
      expect(setAuthUser).toHaveBeenCalledWith(mockUser);
    });

    it("should throw error if guest login fails", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Rate limit exceeded" }),
      });

      await expect(loginAsGuest()).rejects.toThrow("Rate limit exceeded");
    });

    it("should throw default error if guest login response is not ok and has no error field", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(loginAsGuest()).rejects.toThrow("Guest login failed");
    });
  });

  describe("auth-utils environment fallback", () => {
    it("should fall back to empty string if VITE_API_URL is not set", async () => {
      vi.resetModules();
      vi.stubEnv("VITE_API_URL", "");
      const { loginAsGuest: dynamicLoginAsGuest } = await import("./auth-utils");
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "t1", refreshToken: "rt1", user: {} }),
      });
      await dynamicLoginAsGuest();
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/guest", expect.any(Object));
    });
  });
});
