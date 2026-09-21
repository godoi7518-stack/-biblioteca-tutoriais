/**
 * Cliente central da API. Toda comunicação com o backend passa por aqui —
 * nenhum outro arquivo do frontend chama fetch() direto.
 */

export const API_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("bt_token");
}

/**
 * Wrapper de fetch reaproveitado por quase todas as funções abaixo.
 * Anexa o header Authorization automaticamente quando há token salvo, e
 * padroniza o tratamento de erro: se a resposta não for 2xx, lança um
 * Error cujo .message é o campo "detail" que o FastAPI sempre retorna nos
 * seus HTTPException (ex.: "Você não pertence a este workspace").
 */
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

/**
 * Login. Não usa apiFetch de propósito: ainda não existe token nesse ponto
 * (é essa chamada que gera um), e o corpo precisa ser x-www-form-urlencoded
 * (formato exigido pelo OAuth2PasswordRequestForm do backend), não JSON.
 */
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

export async function getCurrentUser() {
  return apiFetch("/auth/me");
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

/**
 * Upload de imagem. Usa FormData em vez de JSON.stringify porque a rota
 * espera multipart/form-data. Não define Content-Type manualmente: o
 * navegador gera esse header sozinho, incluindo o "boundary" que separa
 * os campos do formulário — setar na mão quebraria o upload.
 */
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