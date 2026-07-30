import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type ContentCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
};

export function ContentCard({
  title,
  description,
  icon: Icon,
  href
}: ContentCardProps) {
  const content = (
    <article className="soft-card group h-full overflow-hidden border-t-[3px] border-t-primary p-6 transition hover:-translate-y-1 hover:border-primary/50">
      <div className="mb-5 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon size={22} />
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </article>
  );

  if (href) {
    return (
      <Link className="block h-full" href={href}>
        {content}
      </Link>
    );
  }

  return content;
}
