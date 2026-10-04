/**
 * Cliente central da API. Toda comunicação com o backend passa por aqui —
 * nenhum outro arquivo do frontend chama fetch() direto.
 */

export const API_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("bt_token");
}

// Nome amigável de cada campo, usado nas mensagens de erro de validação.
const FIELD_LABELS = {
  name: "Nome",
  email: "E-mail",
  matricula: "Matrícula",
  password: "Senha",
  role: "Papel",
  username: "E-mail",
  title: "Título",
  summary: "Resumo",
  content: "Conteúdo",
};

/**
 * Traduz UM erro de validação do FastAPI (resposta 422) para português.
 * Cada erro vem como { loc: ["body", "campo"], type, ctx }, e a mensagem
 * original ("msg") é em inglês — por isso montamos a frase pelo "type".
 */
function describeValidationError(item) {
  const loc = item.loc || [];
  const field = loc[loc.length - 1];
  let label = FIELD_LABELS[field] || field || "Campo";

  // Erro dentro de um passo vem como ["body", "steps", 0, "title"]:
  // indica qual passo, contando a partir de 1 como na tela.
  const stepsAt = loc.indexOf("steps");
  if (stepsAt !== -1 && typeof loc[stepsAt + 1] === "number") {
    label = `Passo ${loc[stepsAt + 1] + 1} – ${label}`;
  }

  switch (item.type) {
    case "missing":
      return `${label}: campo obrigatório.`;
    case "string_too_short":
      return item.ctx?.min_length === 1
        ? `${label}: campo obrigatório.`
        : `${label}: mínimo de ${item.ctx?.min_length} caracteres.`;
    case "string_too_long":
      return `${label}: máximo de ${item.ctx?.max_length} caracteres.`;
    case "value_error":
      return field === "email" ? "E-mail inválido." : `${label}: valor inválido.`;
    default:
      return `${label}: valor inválido.`;
  }
}

/**
 * Converte uma resposta de erro do backend em um texto para mostrar na tela.
 * O "detail" do FastAPI pode ser:
 *  - um texto (nossos HTTPException, ex.: "E-mail já cadastrado");
 *  - uma LISTA de objetos (erro 422 de validação) — sem este tratamento,
 *    a tela mostraria "[object Object]".
 */
async function extractErrorMessage(res) {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      return body.detail.map(describeValidationError).join(" ");
    }
  } catch (e) {
    /* resposta sem corpo JSON */
  }
  return "Erro na requisição";
}

/**
 * fetch() só lança exceção quando nem chega a falar com o servidor
 * (backend desligado, sem rede, CORS). Trocamos esse erro técnico
 * ("Failed to fetch") por uma mensagem clara, com status 0.
 */
async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (e) {
    const error = new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    error.status = 0;
    throw error;
  }
}

/**
 * Wrapper de fetch reaproveitado por quase todas as funções abaixo.
 * Anexa o header Authorization automaticamente quando há token salvo, e
 * padroniza o tratamento de erro: se a resposta não for 2xx, lança um
 * Error cujo .message é o texto de erro do backend (ver
 * extractErrorMessage) e cujo .status é o código HTTP.
 */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await safeFetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = new Error(await extractErrorMessage(res));
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

  const res = await safeFetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  // Mesmo tratamento de erro do apiFetch: mostra a mensagem real do
  // backend (ex.: "E-mail ou senha incorretos") em vez de um texto fixo.
  if (!res.ok) {
    const error = new Error(await extractErrorMessage(res));
    error.status = res.status;
    throw error;
  }

  return res.json(); // { access_token, token_type }
}

/** Cadastro de usuário (rota pública). Não faz login: quem chama decide. */
export async function register(name, email, matricula, password) {
  return apiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, matricula, password }),
  });
}

export async function getCurrentUser() {
  return apiFetch("/auth/me");
}

/** Marca um tour de onboarding como visto (ex.: "workspaces", "tabs-admin"). */
export async function markOnboardingSeen(tour) {
  return apiFetch(`/auth/me/onboarding/${encodeURIComponent(tour)}`, { method: "POST" });
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

/**
 * Edita uma categoria. O PUT substitui TODOS os campos, então envie
 * { name, description, position } completos (para renomear, repita os
 * valores atuais de description e position).
 */
export async function updateTab(workspaceId, tabId, data) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function listTutorials(workspaceId, tabId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials`);
}

/**
 * Cria um tutorial. Para "structured", data.steps leva todos os passos
 * ([{ title, content, is_critical }], na ordem) e o backend salva tudo de
 * uma vez. Devolve o tutorial com os passos criados (com ids).
 */
export async function createTutorial(workspaceId, tabId, data) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Edita um tutorial inteiro: { title, summary, content } ou
 * { title, summary, steps }. steps é a lista COMPLETA na ordem desejada:
 * passo com id é atualizado, sem id é criado, e o que não for enviado é
 * apagado. Devolve o tutorial com os passos atualizados.
 */
export async function updateTutorial(workspaceId, tabId, tutorialId, data) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials/${tutorialId}`, {
    method: "PUT",
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

/**
 * Busca global. Devolve { workspaces, tutorials }: workspaces pelo nome e
 * tutoriais pelo título/resumo/conteúdo, só dos workspaces do usuário.
 */
export async function search(q) {
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
export async function uploadImage(workspaceId, tabId, tutorialId, file, caption, stepId) {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  if (stepId) formData.append("step_id", stepId);

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

export async function deleteWorkspace(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
}

export async function deleteTab(workspaceId, tabId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}`, { method: "DELETE" });
}

export async function deleteTutorial(workspaceId, tabId, tutorialId) {
  return apiFetch(`/workspaces/${workspaceId}/tabs/${tabId}/tutorials/${tutorialId}`, { method: "DELETE" });
}

export async function listMembers(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}/members`);
}

export async function inviteMember(workspaceId, email, role) {
  return apiFetch(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
}

/** Troca o papel de um membro (só admin). membershipId é o "id" de MemberResponse. */
export async function updateMemberRole(workspaceId, membershipId, role) {
  return apiFetch(`/workspaces/${workspaceId}/members/${membershipId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

/** Remove um membro do workspace (só admin). Não apaga a conta do usuário. */
export async function removeMember(workspaceId, membershipId) {
  return apiFetch(`/workspaces/${workspaceId}/members/${membershipId}`, { method: "DELETE" });
}

/** O usuário logado sai do workspace (qualquer membro). */
export async function leaveWorkspace(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}/leave`, { method: "POST" });
}
