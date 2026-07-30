import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  visual?: ReactNode;
  children?: ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  visual,
  children
}: PageHeroProps) {
  return (
    <section className="border-b border-border/70 bg-surface/[0.68] backdrop-blur-[2px] section-padding pb-12">
      <div className="container-shell">
        {visual ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.55fr)] lg:items-center">
            <div className="max-w-4xl">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
              <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm lg:max-w-none">
              {visual}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              {description}
            </p>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
