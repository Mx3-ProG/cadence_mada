import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
import {
  Building2,
  Cake,
  Check,
  ChevronDown,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentShareMenu } from "@/components/agenda/appointment-share-menu";
import { StatusBadge } from "@/components/agenda/status-badge";
import { cn } from "@/lib/utils";
import type { Appointment, Contact } from "@/lib/agenda";

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function AppointmentCard({
  appointment,
  contact,
  onEmail,
  onEdit,
  onDelete,
  onDecide,
}: {
  appointment: Appointment;
  contact: Contact | null;
  onEmail: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  onDecide: (appointment: Appointment, accept: boolean) => void;
}) {
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const [open, setOpen] = useState(false);
  const a = appointment;
  const invitees =
    a.invitations?.flatMap((invitation) => (invitation.contact ? [invitation.contact] : [])) ?? [];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/70 bg-surface/70 p-3"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">
            {format(new Date(a.starts_at), "HH:mm")} — {format(new Date(a.ends_at), "HH:mm")}
          </p>
          <h3 className="truncate font-semibold">{a.title}</h3>
          {invitees.length > 1 ? (
            <p className="truncate text-xs text-muted-foreground">
              {invitees.map((invitee) => invitee.name).join(", ")}
            </p>
          ) : contact ? (
            <p className="truncate text-xs text-muted-foreground">
              {contact.name}
              {contact.company ? ` · ${contact.company}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={a.status} />
          {a.source === "public_booking" && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Link2 className="h-2.5 w-2.5" /> {t("card.public_booking")}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
              {(a.location || a.description || a.prep_notes) && (
                <div className="space-y-1.5">
                  {a.location && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{a.location}</span>
                    </p>
                  )}
                  {a.description && (
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  )}
                  {a.prep_notes && (
                    <p className="flex gap-1.5 text-xs text-muted-foreground">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{a.prep_notes}</span>
                    </p>
                  )}
                </div>
              )}

              {invitees.length > 1 ? (
                <div className="rounded-lg bg-background/60 p-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <Users className="h-3 w-3 shrink-0 text-primary" />
                    {t("card.invitees_count", { count: invitees.length })}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {invitees.map((invitee) => invitee.name).join(", ")}
                  </p>
                </div>
              ) : contact ? (
                <div className="rounded-lg bg-background/60 p-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <User className="h-3 w-3 shrink-0 text-primary" />
                    {contact.name}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {contact.company && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {contact.company}
                          {contact.role_title ? ` — ${contact.role_title}` : ""}
                        </span>
                      </p>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={stop}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        onClick={stop}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{contact.phone}</span>
                      </a>
                    )}
                    {contact.birthday && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Cake className="h-3 w-3 shrink-0" />
                        <span>
                          {format(new Date(`${contact.birthday}T00:00:00`), "d MMMM", {
                            locale: dateFnsLocale,
                          })}
                        </span>
                      </p>
                    )}
                    {contact.notes && (
                      <p className="text-xs text-muted-foreground">{contact.notes}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {a.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 flex-1 gap-1 px-2 text-xs"
                    onClick={(e) => {
                      stop(e);
                      onDecide(a, true);
                    }}
                  >
                    <Check className="h-3 w-3" /> {t("card.accept")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 gap-1 px-2 text-xs"
                    onClick={(e) => {
                      stop(e);
                      onDecide(a, false);
                    }}
                  >
                    <X className="h-3 w-3" /> {t("card.decline")}
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1">
                <AppointmentShareMenu appointment={a} onEmail={onEmail} compact />
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7"
                  aria-label={t("card.edit_aria")}
                  onClick={(e) => {
                    stop(e);
                    onEdit(a);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  aria-label={t("card.delete_aria")}
                  onClick={(e) => {
                    stop(e);
                    onDelete(a.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
