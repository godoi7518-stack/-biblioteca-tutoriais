export function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Detecta um texto no formato "1 - algo 2 - algo mais..." (com ou sem
 * quebras de linha reais) e separa em passos, para exibir tutoriais
 * "simple" no mesmo componente de acordeão dos "structured". Exige pelo
 * menos 2 passos numerados encontrados; se não achar, retorna null e quem
 * chamou cai de volta no texto corrido normal (MarkdownLite).
 */
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