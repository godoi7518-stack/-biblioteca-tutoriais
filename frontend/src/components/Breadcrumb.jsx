export default function Breadcrumb({ items, onNavigate }) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <span className="sep">/</span>}
            {isLast ? (
              <span className="current">{item.label}</span>
            ) : (
              <button onClick={() => onNavigate(item)}>{item.label}</button>
            )}
          </span>
        );
      })}
    </div>
  );
}
