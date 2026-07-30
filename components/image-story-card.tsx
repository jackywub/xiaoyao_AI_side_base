import Image from "next/image";
import Link from "next/link";

type ImageStoryCardProps = {
  alt: string;
  compact?: boolean;
  description: string;
  eyebrow?: string;
  href?: string;
  image: string;
  mini?: boolean;
  sizes: string;
  title: string;
};

function CardContent({ alt, compact, description, eyebrow, image, mini, sizes, title }: Omit<ImageStoryCardProps, "href">) {
  const condensed = compact || mini;

  return (
    <>
      <Image
        alt={alt}
        className="object-cover transition duration-500 group-hover:scale-[1.035]"
        fill
        sizes={sizes}
        src={image}
        unoptimized={image.startsWith("/api/media/")}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/32 to-transparent" />
      <span className={`absolute inset-x-0 bottom-0 z-10 text-white ${condensed ? "p-4" : "p-5 sm:p-6"}`}>
        {eyebrow ? <span className="mb-2 block text-[0.68rem] font-semibold uppercase text-white/70">{eyebrow}</span> : null}
        <span className={`block font-display font-semibold leading-snug ${condensed ? "text-lg" : "text-xl"}`}>{title}</span>
        <span className={`mt-2 block text-white/78 ${condensed ? "text-xs leading-5" : "text-sm leading-6"}`}>{description}</span>
      </span>
    </>
  );
}

export function ImageStoryCard({ href, ...contentProps }: ImageStoryCardProps) {
  const height = contentProps.mini ? "min-h-[13rem]" : contentProps.compact ? "min-h-[18rem]" : "min-h-[22rem]";
  const className = `group relative isolate block overflow-hidden rounded-lg border border-border/70 bg-slate-900 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_50px_hsl(var(--foreground)/0.16)] ${height}`;

  if (href) {
    return (
      <Link className={className} href={href}>
        <CardContent {...contentProps} />
      </Link>
    );
  }

  return (
    <article className={className}>
      <CardContent {...contentProps} />
    </article>
  );
}
