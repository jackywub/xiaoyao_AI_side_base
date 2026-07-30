import type { ReactNode } from "react";

import { PageHero } from "@/components/page-hero";
import type { ManagedPageContent } from "@/lib/site-content";

export function ManagedPageHero({ hero, visual }: { hero: ManagedPageContent["hero"]; visual?: ReactNode }) {
  return (
    <PageHero
      description={hero.description}
      eyebrow={hero.eyebrow}
      title={
        <>
          {hero.title}
          {hero.accent ? <><br className="hidden sm:block" /><span className="brush-title">{hero.accent}</span></> : null}
        </>
      }
      visual={visual}
    />
  );
}
