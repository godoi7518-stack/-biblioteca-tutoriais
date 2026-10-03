/**
 * Trilha de navegação ("você está aqui"). Cada nível é um botão com ícone
 * que leva de volta àquela tela; o último é a tela atual: fica destacado e
 * não é clicável.
 *
 * items: [{ label, icon, onClick }] — o App.jsx monta a lista conforme a
 * tela aberta.
 */

export default function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Você está em">
      {items.map((item, i) => {
        const isCurrent = i === items.length - 1;
        const Icon = item.icon;
        return (
          <span className="crumb-wrap" key={i}>
            {i > 0 && (
              <span className="crumb-sep" aria-hidden="true">
                ›
              </span>
            )}
            {isCurrent ? (
              <span className="crumb current" aria-current="page" title={item.label}>
                {Icon && <Icon />}
                <span className="crumb-label">{item.label}</span>
              </span>
            ) : (
              <button className="crumb" onClick={item.onClick} title={`Voltar para ${item.label}`}>
                {Icon && <Icon />}
                <span className="crumb-label">{item.label}</span>
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
