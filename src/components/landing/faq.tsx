import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackEvent } from "@/lib/analytics";

type FaqItem = { q: string; a: string };

export function Faq() {
  const { t } = useTranslation("home");
  const items = t("faq.items", { returnObjects: true }) as FaqItem[];

  return (
    <section id="faq" className="scroll-mt-24 px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("faq.badge")}
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("faq.title")}
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Accordion
            type="single"
            collapsible
            className="mt-10"
            onValueChange={(value) => {
              if (value) trackEvent("faq_open", { question_id: value });
            }}
          >
            {items.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
                <AccordionTrigger className="font-display text-base">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
