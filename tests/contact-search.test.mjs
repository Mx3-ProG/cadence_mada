import assert from "node:assert/strict";
import test from "node:test";
import {
  activeContactFilterCount,
  buildContactAppointmentDates,
  EMPTY_CONTACT_SEARCH_FILTERS,
  filterAndSortContacts,
} from "../src/lib/contact-search.ts";

function contact(overrides) {
  return {
    id: "contact-1",
    owner_id: "owner-1",
    name: "Élodie Martin",
    email: "elodie@example.com",
    phone: "+33 6 00 00 00 00",
    company: "Acmé",
    role_title: "Directrice produit",
    notes: "Rencontrée à Paris",
    birthday: "1990-08-15",
    city: "Lyon",
    address: "1 rue des Fleurs",
    country: "France",
    family_situation: "Mariée",
    gender: "female",
    relationship: "parrain",
    languages: ["Français", "Malgache"],
    hobbies: ["Randonnée", "Lecture"],
    children_count: 2,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function filters(overrides = {}) {
  return { ...EMPTY_CONTACT_SEARCH_FILTERS, ...overrides };
}

test("la recherche est insensible aux accents et couvre les caractéristiques du contact", () => {
  const elodie = contact({});
  const marc = contact({
    id: "contact-2",
    name: "Marc Dupont",
    company: null,
    languages: [],
    hobbies: [],
  });

  assert.deepEqual(
    filterAndSortContacts([marc, elodie], filters({ query: "elodie acme" }), new Map()).map(
      ({ id }) => id,
    ),
    ["contact-1"],
  );
  assert.deepEqual(
    filterAndSortContacts([marc, elodie], filters({ language: "malgache" }), new Map()).map(
      ({ id }) => id,
    ),
    ["contact-1"],
  );
  assert.equal(filterAndSortContacts([marc, elodie], filters(), new Map()).length, 2);
});

test("calcule le prochain et le dernier rendez-vous pour chaque contact", () => {
  const dates = buildContactAppointmentDates(
    [
      { appointmentId: "a1", contactId: "c1", startsAt: "2026-08-14T09:00:00.000Z" },
      { appointmentId: "a2", contactId: "c1", startsAt: "2026-08-16T09:00:00.000Z" },
      { appointmentId: "a3", contactId: "c1", startsAt: "2026-08-20T09:00:00.000Z" },
    ],
    new Date("2026-08-15T09:00:00.000Z"),
  );

  assert.deepEqual(dates.get("c1"), {
    last: "2026-08-14T09:00:00.000Z",
    next: "2026-08-16T09:00:00.000Z",
  });
});

test("filtre et trie les contacts selon leurs rendez-vous", () => {
  const alpha = contact({ id: "alpha", name: "Alpha" });
  const beta = contact({ id: "beta", name: "Beta" });
  const gamma = contact({ id: "gamma", name: "Gamma" });
  const dates = new Map([
    ["alpha", { next: "2026-08-20T09:00:00.000Z", last: "2026-08-10T09:00:00.000Z" }],
    ["beta", { next: "2026-08-18T09:00:00.000Z", last: "2026-08-12T09:00:00.000Z" }],
  ]);

  assert.deepEqual(
    filterAndSortContacts(
      [alpha, beta, gamma],
      filters({ appointmentPeriod: "upcoming", sort: "next-appointment" }),
      dates,
    ).map(({ id }) => id),
    ["beta", "alpha"],
  );
  assert.deepEqual(
    filterAndSortContacts(
      [alpha, beta, gamma],
      filters({ appointmentPeriod: "past", sort: "last-appointment" }),
      dates,
    ).map(({ id }) => id),
    ["beta", "alpha"],
  );
  assert.deepEqual(
    filterAndSortContacts([alpha, beta, gamma], filters({ appointmentPeriod: "none" }), dates).map(
      ({ id }) => id,
    ),
    ["gamma"],
  );
});

test("compte uniquement les filtres actifs et les tris non standards", () => {
  assert.equal(activeContactFilterCount(filters()), 0);
  assert.equal(activeContactFilterCount(filters({ city: "Lyon", appointmentPeriod: "past" })), 2);
  assert.equal(activeContactFilterCount(filters({ sort: "recently-added" })), 1);
});
