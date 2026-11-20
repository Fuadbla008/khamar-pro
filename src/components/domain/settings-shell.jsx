import { SettingsNav } from "./settings-nav";

export function SettingsShell({ farmId, title, description, children }) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <SettingsNav farmId={farmId} />
      <div className="space-y-6">{children}</div>
    </main>
  );
}
