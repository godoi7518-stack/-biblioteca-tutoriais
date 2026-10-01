// Renderizador mínimo de markdown para tutoriais "simple": parágrafos, **negrito**,
// listas "- " e quebra de linha simples dentro de um parágrafo (Enter único vira <br>,
// Enter duplo — linha em branco — separa parágrafos).
// Se o conteúdo real vier de um editor markdown completo no backend, troque isto por uma lib
// como `react-markdown` — mantida fora daqui de propósito para não adicionar dependências.

function formatInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return p;
  });
}

export default function MarkdownLite({ text }) {
  const blocks = text.split("\n\n");
  return (
    <div className="markdown-body">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{formatInline(l.replace(/^- /, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {formatInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}