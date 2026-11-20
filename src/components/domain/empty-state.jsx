export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-2xl" aria-hidden>
        🌱
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
