export const API_URL = "http://127.0.0.1:8000";


function getToken() {
  return localStorage.getItem("bt_token");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = "Erro na requisição";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (e) {
      /* resposta sem corpo JSON */
    }
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function login(username, password) {
  const body = new URLSearchParams();
  body.append("grant_type", "password");
  body.append("username", username);
  body.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error("Usuário ou senha inválidos.");
  }

  return res.json(); // { access_token, token_type }
}

export async function register(name, email, password) {
  return apiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}

export async function listWorkspaces() {
  return apiFetch("/workspaces");
}

export async function createWorkspace(name) {
  return apiFetch("/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function getCurrentUser() {
  return apiFetch("/auth/me");
}

export async function listTabs(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs`);
}

export async function createTab(workspaceId, name) {
  return apiFetch(`/workspaces/${workspaceId}/tabs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description: null, position: 0 }),
  });
}

export async function listTutorials(workspaceId, tabId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials`);
}

export async function createTutorial(workspaceId, tabId, data) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
export async function getTutorial(workspaceId, tabId, tutorialId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials/${tutorialId}`);
}

export async function listSteps(workspaceId, tabId, tutorialId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials/${tutorialId}/steps`);
}

export async function searchTutorials(q) {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`);
}

export async function listImages(workspaceId, tabId, tutorialId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials/${tutorialId}/images`);
}

export async function uploadImage(workspaceId, tabId, tutorialId, file, caption) {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);

  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials/${tutorialId}/images`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteImage(workspaceId, tabId, tutorialId, imageId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials/${tutorialId}/images/${imageId}`, {
    method: "DELETE",
  });
}