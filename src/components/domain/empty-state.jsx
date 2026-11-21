function FarmIllustration() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="49" cy="15" r="6" fill="var(--chart-3)" stroke="none" />
      <path d="M10 31 32 16l22 15" stroke="var(--chart-4)" />
      <path d="M17 31h30v21H17z" fill="var(--chart-1)" stroke="var(--chart-4)" />
      <path d="M28 52V39h8v13" />
      <path d="M8 53c5-5 9-5 14 0M42 53c5-5 9-5 14 0" stroke="var(--chart-2)" />
    </svg>
  );
}

function AnimalIllustration() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M22 19 16 12v14" fill="var(--chart-2)" />
      <path d="M42 19 48 12v14" fill="var(--chart-2)" />
      <path
        d="M20 21a12 12 0 0 1 24 0v11a12 12 0 0 1-24 0z"
        fill="var(--chart-1)"
      />
      <circle cx="27" cy="27" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="37" cy="27" r="1.6" fill="currentColor" stroke="none" />
      <ellipse cx="32" cy="37" rx="7" ry="5" fill="var(--chart-3)" />
      <circle cx="29.5" cy="37" r="1" fill="currentColor" stroke="none" />
      <circle cx="34.5" cy="37" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function EmptyState({ title, description, action, illustration = "farm" }) {
  let art;
  if (illustration === "animal") art = <AnimalIllustration />;
  else if (illustration === "farm") art = <FarmIllustration />;
  else art = illustration;

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span
        className="grid size-14 place-items-center rounded-2xl bg-muted text-chart-1"
        aria-hidden="true"
      >
        {art}
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
