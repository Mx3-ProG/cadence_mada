import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { AppointmentDialog } from "@/components/agenda/appointment-dialog";
import { ContactDialog } from "@/components/agenda/contact-dialog";
import { planUsageQueryKey } from "@/lib/plan";
import type { Contact } from "@/lib/agenda";

async function fetchContacts() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  // Filtre explicite : la policy RLS laisse aussi passer un admin (pour la console
  // /admin), donc sans ce filtre un admin verrait les contacts de tout le monde ici.
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

type Step = "choose" | "pick-contact";

export function QuickAppointmentFlow({
  open,
  onOpenChange,
  defaultDate = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: Date | null;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("agenda");
  const [step, setStep] = useState<Step>("choose");
  const [contactOpen, setContactOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [presetContactId, setPresetContactId] = useState<string | null>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchContacts,
    enabled: open || contactOpen || apptOpen,
  });

  useEffect(() => {
    if (open) setStep("choose");
  }, [open]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
  };

  const startWithoutContact = () => {
    setPresetContactId(null);
    onOpenChange(false);
    setApptOpen(true);
  };

  const pickExistingContact = (contact: Contact) => {
    setPresetContactId(contact.id);
    onOpenChange(false);
    setApptOpen(true);
  };

  const startWithNewContact = () => {
    onOpenChange(false);
    setContactOpen(true);
  };

  const afterContactSaved = async () => {
    invalidate();
    const fresh = await queryClient.fetchQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
    setPresetContactId(fresh[0]?.id ?? null);
    setContactOpen(false);
    setApptOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {step === "choose" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("quick.title")}</DialogTitle>
                <DialogDescription>{t("quick.subtitle")}</DialogDescription>
              </DialogHeader>

              <div className="grid min-w-0 gap-3">
                <button
                  type="button"
                  onClick={() => setStep("pick-contact")}
                  className="flex min-w-0 items-start gap-3 rounded-2xl border border-border/70 bg-surface/60 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Users className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t("quick.existing_contact")}</span>
                    <span className="block text-sm text-muted-foreground">
                      {t("quick.contacts_count", { count: contacts.length })}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={startWithNewContact}
                  className="flex min-w-0 items-start gap-3 rounded-2xl border border-border/70 bg-surface/60 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                    <UserPlus className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t("quick.new_contact")}</span>
                    <span className="block text-sm text-muted-foreground">
                      {t("quick.new_contact_hint")}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={startWithoutContact}
                  className="flex items-center gap-2 rounded-2xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CalendarPlus className="h-4 w-4" />
                  {t("quick.no_contact")}
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-ms-2 h-7 w-7 shrink-0"
                    aria-label={t("quick.back_aria")}
                    onClick={() => setStep("choose")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <DialogTitle>{t("quick.pick_contact_title")}</DialogTitle>
                </div>
                <DialogDescription>{t("quick.pick_contact_subtitle")}</DialogDescription>
              </DialogHeader>

              <Command className="rounded-xl border border-border/70">
                <CommandInput placeholder={t("quick.search_placeholder")} />
                <CommandList>
                  <CommandEmpty>{t("quick.no_results")}</CommandEmpty>
                  <CommandGroup>
                    {contacts.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.company ?? ""}`}
                        onSelect={() => pickExistingContact(c)}
                        className="cursor-pointer py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.name}</span>
                          {c.company && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {c.company}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ContactDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        contact={null}
        onSaved={() => void afterContactSaved()}
      />

      <AppointmentDialog
        open={apptOpen}
        onOpenChange={setApptOpen}
        appointment={null}
        contacts={contacts}
        defaultDate={defaultDate}
        presetContactId={presetContactId}
        onSaved={invalidate}
      />
    </>
  );
}
