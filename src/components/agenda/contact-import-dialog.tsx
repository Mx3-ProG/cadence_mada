import { useEffect, useRef, useState, type DragEvent } from "react";
import { ContactRound, FileUp, Loader2, Smartphone, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  parseContactFile,
  removeDuplicateContacts,
  type ImportedContact,
} from "@/lib/contact-import";
import { planErrorMessage, TIER_LIMITS, type PlanUsage } from "@/lib/plan";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeviceContact = {
  name?: string[];
  email?: string[];
  tel?: string[];
  address?: Array<{ addressLine?: string[]; city?: string; country?: string }>;
};

type ContactNavigator = Navigator & {
  contacts?: {
    getProperties?(): Promise<Array<"name" | "email" | "tel" | "address">>;
    select(
      properties: Array<"name" | "email" | "tel" | "address">,
      options: { multiple: boolean },
    ): Promise<DeviceContact[]>;
  };
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function supportsContactPicker() {
  return typeof navigator !== "undefined" && "contacts" in navigator && window.isSecureContext;
}

function deviceContactToImport(contact: DeviceContact): ImportedContact | null {
  const name = contact.name?.[0]?.trim().slice(0, 120);
  if (!name) return null;
  const address = contact.address?.[0];
  const addressText = address
    ? [...(address.addressLine ?? []), address.city, address.country].filter(Boolean).join(", ")
    : "";
  return {
    name,
    email: contact.email?.[0]?.trim().slice(0, 255) || null,
    phone: contact.tel?.[0]?.trim().slice(0, 40) || null,
    address: addressText.slice(0, 250) || null,
    company: null,
    role_title: null,
    birthday: null,
    notes: null,
  };
}

export function ContactImportDialog({
  open,
  onOpenChange,
  existingContacts,
  usage,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingContacts: Array<{ email: string | null; phone: string | null }>;
  usage: PlanUsage | undefined;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const pickerAvailable = supportsContactPicker();

  useEffect(() => {
    if (open) trackEvent("contact_import_started");
  }, [open]);

  const save = async (rawContacts: ImportedContact[]) => {
    const { contacts, duplicates } = removeDuplicateContacts(rawContacts, existingContacts);
    if (!contacts.length) {
      toast.info(
        duplicates
          ? "Tous ces contacts sont déjà dans ton carnet."
          : "Aucun contact valide trouvé.",
      );
      return;
    }

    let candidates = contacts;
    let omittedForQuota = 0;
    if (usage && !usage.isAdmin) {
      const limit = TIER_LIMITS[usage.plan].contacts;
      if (limit !== null) {
        const remaining = Math.max(0, limit - usage.contacts);
        omittedForQuota = Math.max(0, candidates.length - remaining);
        candidates = candidates.slice(0, remaining);
      }
    }
    if (!candidates.length) {
      toast.error("La limite de contacts de ton forfait est atteinte.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const ownerId = auth.user?.id;
    if (!ownerId) throw new Error("Session expirée.");
    const { error } = await supabase
      .from("contacts")
      .insert(candidates.map((contact) => ({ ...contact, owner_id: ownerId })));
    if (error) throw new Error(planErrorMessage(error.message, usage) ?? error.message);

    const details = [
      duplicates
        ? `${duplicates} doublon${duplicates > 1 ? "s" : ""} ignoré${duplicates > 1 ? "s" : ""}`
        : "",
      omittedForQuota ? `${omittedForQuota} hors quota` : "",
    ].filter(Boolean);
    toast.success(
      `${candidates.length} contact${candidates.length > 1 ? "s" : ""} importé${candidates.length > 1 ? "s" : ""}${details.length ? ` · ${details.join(" · ")}` : ""}`,
    );
    onOpenChange(false);
    onImported();
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Le fichier dépasse la taille maximale de 5 Mo.");
      return;
    }
    setBusy(true);
    try {
      await save(parseContactFile(file.name, await file.text()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'importer ce fichier.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const importFromDevice = async () => {
    const contactsApi = (navigator as ContactNavigator).contacts;
    if (!contactsApi) return;
    setBusy(true);
    try {
      const requested = ["name", "email", "tel", "address"] as const;
      const supported = contactsApi.getProperties ? await contactsApi.getProperties() : requested;
      const properties = requested.filter((property) => supported.includes(property));
      const selected = await contactsApi.select([...properties], {
        multiple: true,
      });
      await save(selected.map(deviceContactToImport).filter((contact) => contact !== null));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Accès aux contacts impossible.");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void importFile(event.dataTransfer.files[0]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ContactRound className="h-5 w-5 text-primary" />
            Importer des contacts
          </DialogTitle>
          <DialogDescription>
            Ajoute plusieurs personnes à ton carnet en une seule fois. Les doublons par e-mail ou
            téléphone sont ignorés.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {pickerAvailable ? (
            <Button
              className="h-auto justify-start gap-3 px-4 py-3"
              disabled={busy}
              onClick={importFromDevice}
            >
              <Smartphone className="h-5 w-5 shrink-0" />
              <span className="text-left">
                <span className="block font-semibold">Choisir depuis mon téléphone</span>
                <span className="block text-xs font-normal opacity-80">
                  Ton appareil te demandera ton autorisation
                </span>
              </span>
            </Button>
          ) : (
            <div className="rounded-xl border bg-muted/35 p-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Smartphone className="h-4 w-4" /> Carnet du téléphone indisponible
              </p>
              <p className="mt-1 text-xs">
                Ce navigateur bloque l’accès direct. Exporte tout ton carnet en un fichier VCF, puis
                sélectionne-le ci-dessous :
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  <strong className="text-foreground">iPhone :</strong> Contacts → Listes → appui
                  long sur une liste → Exporter.
                </li>
                <li>
                  <strong className="text-foreground">Android :</strong> Contacts → Corriger et
                  gérer → Exporter vers un fichier.
                </li>
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou par fichier{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Déposer ou choisir un fichier de contacts"
            className={`grid min-h-40 cursor-pointer place-items-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-muted/30"}`}
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && !busy) inputRef.current?.click();
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div>
              {busy ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="mx-auto h-8 w-8 text-primary" />
              )}
              <p className="mt-3 text-sm font-semibold">Glisse-dépose ton fichier ici</p>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV ou vCard (.vcf), 5 Mo maximum
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                disabled={busy}
              >
                <FileUp className="h-4 w-4" /> Choisir un fichier
              </Button>
            </div>
          </div>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
