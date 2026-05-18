export function AccountPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header>
      <h1 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157] sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm text-[#2A4C6A]/75">{description}</p>
      ) : null}
    </header>
  );
}
