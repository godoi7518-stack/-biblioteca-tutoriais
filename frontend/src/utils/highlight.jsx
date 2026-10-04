/**
 * Destaca as palavras buscadas dentro de um texto (para os resultados da
 * busca). Ignora maiúsculas e acentos, como a busca do backend: buscar
 * "reimpressao" destaca "Reimpressão".
 */

/** Minúsculas e sem acento, um caractere por caractere do original (assim
    as posições encontradas valem também no texto original). */
function normalize(text) {
  let out = "";
  for (const ch of text) {
    const base = ch.normalize("NFD")[0].toLowerCase();
    out += base[0] || ch;
  }
  return out;
}

/** Devolve o texto com as palavras de `query` dentro de <mark>. */
export function highlight(text, query) {
  if (!text) return text;
  const words = (query.match(/[\p{L}\p{N}_]+/gu) || []).map(normalize).filter((w) => w.length > 0);
  if (words.length === 0) return text;

  const chars = [...text];
  const norm = normalize(text);
  const marked = new Array(chars.length).fill(false);
  for (const w of words) {
    let from = 0;
    let pos;
    while ((pos = norm.indexOf(w, from)) !== -1) {
      for (let i = pos; i < pos + w.length; i++) marked[i] = true;
      from = pos + w.length;
    }
  }

  // Junta caracteres vizinhos com o mesmo estado em pedaços.
  const parts = [];
  let current = "";
  let currentMarked = marked[0];
  chars.forEach((ch, i) => {
    if (marked[i] !== currentMarked) {
      parts.push([current, currentMarked]);
      current = "";
      currentMarked = marked[i];
    }
    current += ch;
  });
  parts.push([current, currentMarked]);

  return parts.map(([piece, isHit], i) =>
    isHit ? (
      <mark className="search-hit" key={i}>
        {piece}
      </mark>
    ) : (
      piece
    )
  );
}
