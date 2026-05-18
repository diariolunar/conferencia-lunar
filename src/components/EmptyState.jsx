export default function EmptyState({ titulo, descricao }) {
  return (
    <div className="empty-state">
      <h3>{titulo}</h3>
      <p>{descricao}</p>
    </div>
  );
}