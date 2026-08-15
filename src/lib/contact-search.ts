import type { Contact } from "@/lib/agenda";

export type ContactAppointmentLink = {
  appointmentId: string;
  contactId: string;
  startsAt: string;
};

export type ContactAppointmentDates = {
  next: string | null;
  last: string | null;
};

export type ContactSearchFilters = {
  query: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  city: string;
  address: string;
  country: string;
  language: string;
  hobby: string;
  family: string;
  notes: string;
  gender: "all" | "female" | "male" | "other" | "unspecified";
  relationship: "all" | "parrain" | "filleul" | "none";
  birthday: string;
  birthdayMonth: string;
  childrenMin: string;
  childrenMax: string;
  appointmentPeriod: "all" | "upcoming" | "past" | "none";
  sort: "name" | "next-appointment" | "last-appointment" | "recently-added";
};

export const EMPTY_CONTACT_SEARCH_FILTERS: ContactSearchFilters = {
  query: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  city: "",
  address: "",
  country: "",
  language: "",
  hobby: "",
  family: "",
  notes: "",
  gender: "all",
  relationship: "all",
  birthday: "",
  birthdayMonth: "",
  childrenMin: "",
  childrenMax: "",
  appointmentPeriod: "all",
  sort: "name",
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

function contains(value: string | null | undefined, search: string) {
  const needle = normalize(search);
  return !needle || normalize(value).includes(needle);
}

export function buildContactAppointmentDates(
  links: ContactAppointmentLink[],
  now = new Date(),
): Map<string, ContactAppointmentDates> {
  const result = new Map<string, ContactAppointmentDates>();
  const nowTime = now.getTime();

  for (const link of links) {
    const time = new Date(link.startsAt).getTime();
    if (Number.isNaN(time)) continue;
    const current = result.get(link.contactId) ?? { next: null, last: null };

    if (time >= nowTime && (!current.next || time < new Date(current.next).getTime())) {
      current.next = link.startsAt;
    }
    if (time < nowTime && (!current.last || time > new Date(current.last).getTime())) {
      current.last = link.startsAt;
    }
    result.set(link.contactId, current);
  }

  return result;
}

export function activeContactFilterCount(filters: ContactSearchFilters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "sort") return value !== "name";
    if (key === "gender" || key === "relationship" || key === "appointmentPeriod") {
      return value !== "all";
    }
    return value !== "";
  }).length;
}

export function filterAndSortContacts(
  contacts: Contact[],
  filters: ContactSearchFilters,
  appointmentDates: Map<string, ContactAppointmentDates>,
) {
  const childrenMin = filters.childrenMin === "" ? null : Number(filters.childrenMin);
  const childrenMax = filters.childrenMax === "" ? null : Number(filters.childrenMax);
  const queryTerms = normalize(filters.query).split(/\s+/).filter(Boolean);

  const filtered = contacts.filter((contact) => {
    const searchable = [
      contact.name,
      contact.email,
      contact.phone,
      contact.company,
      contact.role_title,
      contact.notes,
      contact.birthday,
      contact.city,
      contact.address,
      contact.country,
      contact.family_situation,
      contact.gender,
      contact.relationship,
      ...contact.languages,
      ...contact.hobbies,
      contact.children_count === null ? "" : String(contact.children_count),
    ]
      .map(normalize)
      .join(" ");
    if (queryTerms.some((term) => !searchable.includes(term))) return false;
    if (!contains(contact.name, filters.name)) return false;
    if (!contains(contact.email, filters.email)) return false;
    if (!contains(contact.phone, filters.phone)) return false;
    if (!contains(contact.company, filters.company)) return false;
    if (!contains(contact.role_title, filters.role)) return false;
    if (!contains(contact.city, filters.city)) return false;
    if (!contains(contact.address, filters.address)) return false;
    if (!contains(contact.country, filters.country)) return false;
    if (filters.language && !contact.languages.some((value) => contains(value, filters.language))) {
      return false;
    }
    if (filters.hobby && !contact.hobbies.some((value) => contains(value, filters.hobby))) {
      return false;
    }
    if (!contains(contact.family_situation, filters.family)) return false;
    if (!contains(contact.notes, filters.notes)) return false;

    if (filters.gender === "unspecified" && contact.gender !== null) return false;
    if (filters.gender !== "all" && filters.gender !== "unspecified") {
      if (contact.gender !== filters.gender) return false;
    }
    if (filters.relationship === "none" && contact.relationship !== null) return false;
    if (filters.relationship !== "all" && filters.relationship !== "none") {
      if (contact.relationship !== filters.relationship) return false;
    }
    if (filters.birthdayMonth && contact.birthday?.slice(5, 7) !== filters.birthdayMonth) {
      return false;
    }
    if (filters.birthday && contact.birthday !== filters.birthday) return false;
    if (childrenMin !== null && (contact.children_count ?? -1) < childrenMin) return false;
    if (
      childrenMax !== null &&
      (contact.children_count ?? Number.POSITIVE_INFINITY) > childrenMax
    ) {
      return false;
    }

    const dates = appointmentDates.get(contact.id);
    if (filters.appointmentPeriod === "upcoming" && !dates?.next) return false;
    if (filters.appointmentPeriod === "past" && !dates?.last) return false;
    if (filters.appointmentPeriod === "none" && (dates?.next || dates?.last)) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "recently-added") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    if (filters.sort === "next-appointment" || filters.sort === "last-appointment") {
      const key = filters.sort === "next-appointment" ? "next" : "last";
      const aDate = appointmentDates.get(a.id)?.[key];
      const bDate = appointmentDates.get(b.id)?.[key];
      if (aDate && bDate) {
        const difference = new Date(aDate).getTime() - new Date(bDate).getTime();
        return key === "last" ? -difference : difference;
      }
      if (aDate) return -1;
      if (bDate) return 1;
    }

    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });
}
