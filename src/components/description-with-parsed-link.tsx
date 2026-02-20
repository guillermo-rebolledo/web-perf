import Link from "next/link";
import { cn } from "@/lib/utils";
import { parseDescriptionWithLink } from "@/lib/url-utils";

export function DescriptionWithParsedLink({
  description,
  textClassName = "",
  linkClassName = "",
}: {
  textClassName?: string;
  linkClassName?: string;
  description: string;
}) {
  const parsed = parseDescriptionWithLink(description);

  if (parsed.kind === "plain") {
    return <p className={textClassName}>{parsed.text}</p>;
  }
  return (
    <p
      className={cn(
        "text-sm text-muted-foreground line-clamp-2",
        textClassName,
      )}
    >
      {parsed.before}
      <Link
        href={parsed.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "text-primary underline-offset-2 hover:underline",
          linkClassName,
        )}
      >
        {parsed.linkText}
      </Link>
      {parsed.after}
    </p>
  );
}
