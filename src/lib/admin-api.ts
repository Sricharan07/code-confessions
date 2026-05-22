const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

async function fetchJson(path: string, options: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const errorJson = await res.json();
      errorMsg = errorJson?.error || errorJson?.message || errorMsg;
    } catch {
      // not json
    }
    throw new HttpError(res.status, errorMsg);
  }
  return res.json();
}

export async function fetchAdminData(token: string) {
  return fetchJson("/api/admin/data", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function grantModerator(token: string, profileId: string) {
  return fetchJson("/api/admin/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "grantModerator", profileId }),
  });
}

export async function toggleUserRole(token: string, profileId: string, currentRole: string) {
  return fetchJson("/api/admin/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "toggleRole", profileId, role: currentRole }),
  });
}

export async function dismissReport(token: string, reportId: string) {
  return fetchJson("/api/admin/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "dismissReport", targetId: reportId }),
  });
}

export async function deleteReportedContent(
  token: string,
  targetId: string,
  targetType: "post" | "comment"
) {
  return fetchJson("/api/admin/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "deleteReportedContent", targetId, targetType }),
  });
}

export async function togglePostHidden(token: string, postId: string) {
  return fetchJson("/api/admin/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "toggleHidden", targetId: postId }),
  });
}

export async function deletePostAdmin(token: string, postId: string) {
  return fetchJson("/api/admin/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "deletePost", targetId: postId }),
  });
}

export async function adminLogin(username: string, password: string) {
  return fetchJson("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
}
