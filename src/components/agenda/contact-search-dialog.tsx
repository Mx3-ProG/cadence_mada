import { CalendarClock, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPTY_CONTACT_SEARCH_FILTERS, type ContactSearchFilters } from "@/lib/contact-search";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function ContactSearchDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  resultsCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ContactSearchFilters;
  onFiltersChange: (filters: ContactSearchFilters) => void;
  resultsCount: number;
}) {
  const set = <Key extends keyof ContactSearchFilters>(
    key: Key,
    value: ContactSearchFilters[Key],
  ) => onFiltersChange({ ...filters, [key]: value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[1.75rem] border-border/70 p-0 sm:max-w-2xl">
        <DialogHeader className="px-5 pb-1 pt-5 text-left sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Rechercher un contact</DialogTitle>
              <DialogDescription>
                Affine les résultats avec les informations du carnet.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-w-0 gap-6 px-5 py-4 sm:px-6">
          <div className="grid gap-2">
            <Label htmlFor="contact-search">Recherche générale</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contact-search"
                className="h-11 rounded-xl ps-10"
                value={filters.query}
                onChange={(event) => set("query", event.target.value)}
                placeholder="Nom, email, téléphone, note…"
              />
            </div>
          </div>

          <section className="grid gap-3 border-t border-border/70 pt-5">
            <h3 className="text-sm font-semibold">Identité et coordonnées</h3>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <FilterInput
                id="search-name"
                label="Nom"
                value={filters.name}
                onChange={(value) => set("name", value)}
              />
              <FilterInput
                id="search-email"
                label="Email"
                value={filters.email}
                onChange={(value) => set("email", value)}
              />
              <FilterInput
                id="search-phone"
                label="Téléphone"
                value={filters.phone}
                onChange={(value) => set("phone", value)}
              />
              <FilterInput
                id="search-address"
                label="Adresse"
                value={filters.address}
                onChange={(value) => set("address", value)}
              />
              <FilterInput
                id="search-city"
                label="Ville"
                value={filters.city}
                onChange={(value) => set("city", value)}
              />
              <FilterInput
                id="search-country"
                label="Pays"
                value={filters.country}
                onChange={(value) => set("country", value)}
              />
            </div>
          </section>

          <section className="grid gap-3 border-t border-border/70 pt-5">
            <h3 className="text-sm font-semibold">Activité et centres d’intérêt</h3>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <FilterInput
                id="search-company"
                label="Société"
                value={filters.company}
                onChange={(value) => set("company", value)}
              />
              <FilterInput
                id="search-role"
                label="Poste"
                value={filters.role}
                onChange={(value) => set("role", value)}
              />
              <FilterInput
                id="search-language"
                label="Langue parlée"
                value={filters.language}
                onChange={(value) => set("language", value)}
              />
              <FilterInput
                id="search-hobby"
                label="Hobby"
                value={filters.hobby}
                onChange={(value) => set("hobby", value)}
              />
            </div>
          </section>

          <section className="grid gap-3 border-t border-border/70 pt-5">
            <h3 className="text-sm font-semibold">Informations personnelles</h3>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <FilterSelect
                label="Sexe"
                value={filters.gender}
                onChange={(value) => set("gender", value as ContactSearchFilters["gender"])}
                options={[
                  ["all", "Tous"],
                  ["female", "Femme"],
                  ["male", "Homme"],
                  ["other", "Autre"],
                  ["unspecified", "Non précisé"],
                ]}
              />
              <FilterSelect
                label="Parrainage"
                value={filters.relationship}
                onChange={(value) =>
                  set("relationship", value as ContactSearchFilters["relationship"])
                }
                options={[
                  ["all", "Tous"],
                  ["parrain", "Parrain"],
                  ["filleul", "Filleul"],
                  ["none", "Sans relation"],
                ]}
              />
              <FilterSelect
                label="Mois d’anniversaire"
                value={filters.birthdayMonth || "all"}
                onChange={(value) => set("birthdayMonth", value === "all" ? "" : value)}
                options={[
                  ["all", "Tous les mois"],
                  ...MONTHS.map((month, index) => [String(index + 1).padStart(2, "0"), month]),
                ]}
              />
              <FilterInput
                id="search-birthday"
                label="Date d’anniversaire exacte"
                type="date"
                value={filters.birthday}
                onChange={(value) => set("birthday", value)}
              />
              <FilterInput
                id="search-family"
                label="Situation familiale"
                value={filters.family}
                onChange={(value) => set("family", value)}
              />
              <FilterInput
                id="search-children-min"
                label="Nombre d’enfants minimum"
                type="number"
                value={filters.childrenMin}
                onChange={(value) => set("childrenMin", value)}
              />
              <FilterInput
                id="search-children-max"
                label="Nombre d’enfants maximum"
                type="number"
                value={filters.childrenMax}
                onChange={(value) => set("childrenMax", value)}
              />
              <FilterInput
                id="search-notes"
                label="Contenu des notes"
                value={filters.notes}
                onChange={(value) => set("notes", value)}
              />
            </div>
          </section>

          <section className="grid gap-3 border-t border-border/70 pt-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Rendez-vous et classement</h3>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <FilterSelect
                label="Afficher"
                value={filters.appointmentPeriod}
                onChange={(value) =>
                  set("appointmentPeriod", value as ContactSearchFilters["appointmentPeriod"])
                }
                options={[
                  ["all", "Tous les contacts"],
                  ["upcoming", "Avec un rendez-vous à venir"],
                  ["past", "Avec un rendez-vous passé"],
                  ["none", "Sans rendez-vous"],
                ]}
              />
              <FilterSelect
                label="Trier par"
                value={filters.sort}
                onChange={(value) => set("sort", value as ContactSearchFilters["sort"])}
                options={[
                  ["name", "Nom, de A à Z"],
                  ["next-appointment", "Prochain rendez-vous"],
                  ["last-appointment", "Dernier rendez-vous passé"],
                  ["recently-added", "Ajout le plus récent"],
                ]}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="sticky bottom-0 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border/70 bg-background/90 px-5 py-4 backdrop-blur-xl sm:flex sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => onFiltersChange({ ...EMPTY_CONTACT_SEARCH_FILTERS })}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </Button>
          <Button type="button" className="h-11 rounded-xl" onClick={() => onOpenChange(false)}>
            Afficher {resultsCount} résultat{resultsCount > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterInput({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 30 : undefined}
        className="h-10 rounded-xl"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 min-w-0 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue!}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
