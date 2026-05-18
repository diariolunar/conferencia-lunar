export default function CardResumo({ titulo, valor, descricao, icon: Icon }) {
  return (
    <article className="summary-card">
      <div className="summary-icon">{Icon ? <Icon size={22} /> : null}</div>

      <div>
        <p>{titulo}</p>
        <strong>{valor}</strong>
        {descricao ? <span>{descricao}</span> : null}
      </div>
    </article>
  );
}