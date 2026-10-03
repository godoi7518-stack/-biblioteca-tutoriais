/**
 * Rascunhos do formulário de tutorial, guardados no localStorage.
 *
 * Evita perder o que foi digitado ao fechar o formulário sem querer (Esc,
 * clique fora, fechar a aba). A chave inclui o id do usuário, para que, num
 * computador compartilhado, uma pessoa não veja o rascunho de outra:
 *   - novo tutorial:  bt_draft:u{usuário}:new:{workspace}:{categoria}
 *   - editar tutorial: bt_draft:u{usuário}:edit:{tutorial}
 *
 * Arquivos de imagem escolhidos e ainda não enviados NÃO entram no rascunho
 * (o localStorage só guarda texto).
 */

const PREFIX = "bt_draft";

export function draftKey({ userId, workspaceId, tabId, tutorialId }) {
  return tutorialId
    ? `${PREFIX}:u${userId}:edit:${tutorialId}`
    : `${PREFIX}:u${userId}:new:${workspaceId}:${tabId}`;
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null; // rascunho corrompido ou localStorage indisponível
  }
}

export function saveDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  } catch (e) {
    /* sem espaço ou sem localStorage: o formulário continua funcionando */
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    /* nada a fazer */
  }
}

export function hasDraft(key) {
  return loadDraft(key) !== null;
}
