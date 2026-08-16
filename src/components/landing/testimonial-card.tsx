import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type TestimonialCardProps = {
  firstName: string;
  role: string;
  photoUrl?: string;
  quote: string;
  metric?: string;
};

// Ready for real, authorized testimonials — not rendered on the landing page
// yet because none exist today (see TRANSLATION_TODO.md / landing rewrite
// notes). Wire this into a new "testimonials" section once real quotes are
// collected; do not fill it with placeholder or fabricated content.
export function TestimonialCard({
  firstName,
  role,
  photoUrl,
  quote,
  metric,
}: TestimonialCardProps) {
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <article className="glass-panel h-full rounded-2xl p-6">
      <p className="text-sm leading-relaxed text-foreground/90">“{quote}”</p>
      <div className="mt-5 flex items-center gap-3">
        <Avatar>
          {photoUrl && <AvatarImage src={photoUrl} alt={firstName} />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{firstName}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
        {metric && (
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {metric}
          </span>
        )}
      </div>
    </article>
  );
}
