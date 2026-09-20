import { TUTORIALS } from "../data/mockData";

export function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Busca simples em memória — simula o FULLTEXT que já existe no schema MySQL.
// Ao ligar no backend real, troque por uma chamada a algo como
// GET /tutorials/search?q=... e retorne o resultado da API aqui.
export function searchTutorials(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TUTORIALS.filter((t) => {
    const haystack = (
      t.title +
      " " +
      t.summary +
      " " +
      (t.body || "") +
      (t.steps ? t.steps.map((s) => s.title + " " + s.text).join(" ") : "")
    ).toLowerCase();
    return haystack.includes(q);
  });
}

// Detecta um texto no formato "1 - algo 2 - algo mais..." (com ou sem quebras de linha)
// e separa em passos. Retorna null se não achar pelo menos 2 passos numerados.
export function parseNumberedSteps(text) {
  if (!text) return null;

  const regex = /(?:^|\n|\s)(\d+)\s*[-.]\s+/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push({ index: match.index, end: match.index + match[0].length, number: match[1] });
  }

  if (matches.length < 2) return null;

  return matches.map((m, i) => {
    const start = m.end;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    return { number: m.number, text: text.slice(start, end).trim() };
  });
}