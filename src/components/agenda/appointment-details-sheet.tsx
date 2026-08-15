import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
import {
  Building2,
  Cake,
  Check,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/agenda/status-badge";
import { AppointmentShareMenu } from "@/components/agenda/appointment-share-menu";
import type { Appointment, Contact } from "@/lib/agenda";

export function AppointmentDetailsSheet({
  appointment,
  contact,
  onOpenChange,
  onEdit,
  onDelete,
  onEmail,
  onDecide,
}: {
  appointment: Appointment | null;
  contact: Contact | null;
  onOpenChange: (v: boolean) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  onEmail: (appointment: Appointment) => void;
  onDecide: (appointment: Appointment, accept: boolean) => void;
}) {
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const a = appointment;
  const invitations = a?.invitations ?? [];

  return (
    <Sheet open={!!a} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        {a && (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-2 pr-6">
                <SheetTitle className="text-left">{a.title}</SheetTitle>
                <StatusBadge status={a.status} />
              </div>
              <SheetDescription className="text-left">
                {format(new Date(a.starts_at), "EEEE d MMMM", { locale: dateFnsLocale })} ·{" "}
                {format(new Date(a.starts_at), "HH:mm")}–{format(new Date(a.ends_at), "HH:mm")}
              </SheetDescription>
              {a.source === "public_booking" && (
                <span className="flex w-fit items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Link2 className="h-3 w-3" /> {t("sheet.public_booking")}
                </span>
              )}
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {(a.location || a.description || a.prep_notes) && (
                <div className="space-y-2 rounded-xl border border-border/70 bg-surface/70 p-3">
                  {a.location && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{a.location}</span>
                    </p>
                  )}
                  {a.description && (
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                  )}
                  {a.prep_notes && (
                    <p className="flex gap-1.5 text-sm text-muted-foreground">
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{a.prep_notes}</span>
                    </p>
                  )}
                </div>
              )}

              {invitations.length > 1 ? (
                <div className="rounded-xl border border-border/70 bg-surface/70 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {t("card.invitees_count", { count: invitations.length })}
                  </p>
                  <div className="mt-2 space-y-2">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm">
                          {invitation.contact?.name ?? t("sheet.deleted_contact")}
                        </span>
                        <StatusBadge status={invitation.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : contact ? (
                <div className="rounded-xl border border-border/70 bg-surface/70 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {contact.name}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {contact.company && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {contact.company}
                          {contact.role_title ? ` — ${contact.role_title}` : ""}
                        </span>
                      </p>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{contact.phone}</span>
                      </a>
                    )}
                    {contact.birthday && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Cake className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {format(new Date(`${contact.birthday}T00:00:00`), "d MMMM", {
                            locale: dateFnsLocale,
                          })}
                        </span>
                      </p>
                    )}
                    {contact.notes && (
                      <p className="text-sm text-muted-foreground">{contact.notes}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {a.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1.5" onClick={() => onDecide(a, true)}>
                    <Check className="h-4 w-4" /> {t("card.accept")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => onDecide(a, false)}
                  >
                    <X className="h-4 w-4" /> {t("card.decline")}
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <AppointmentShareMenu appointment={a} onEmail={onEmail} />
              </div>
            </div>

            <div className="mt-auto flex gap-2 border-t border-border/70 pt-4">
              <Button variant="ghost" className="flex-1 gap-1.5" onClick={() => onEdit(a)}>
                <Pencil className="h-4 w-4" /> {t("sheet.edit")}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-1.5 text-destructive hover:text-destructive"
                onClick={() => {
                  onDelete(a.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4" /> {t("sheet.delete")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
