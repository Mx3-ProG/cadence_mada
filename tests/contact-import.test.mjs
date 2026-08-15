import assert from "node:assert/strict";
import test from "node:test";
import {
  parseContactFile,
  parseCsvContacts,
  parseVCardContacts,
  removeDuplicateContacts,
} from "../src/lib/contact-import.ts";

test("importe un CSV français avec séparateur point-virgule et champs échappés", () => {
  const contacts = parseCsvContacts(
    'Prénom;Nom de famille;E-mail;Téléphone;Société;Notes\r\nCamille;Dubois;camille@example.com;06 12 34 56 78;Acme;"Client, fidèle"',
  );
  assert.deepEqual(contacts, [
    {
      name: "Camille Dubois",
      email: "camille@example.com",
      phone: "06 12 34 56 78",
      company: "Acme",
      role_title: null,
      address: null,
      birthday: null,
      notes: "Client, fidèle",
    },
  ]);
});

test("importe plusieurs cartes vCard et déplie les lignes", () => {
  const contacts = parseVCardContacts(
    "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Zoé Martin\r\nTEL;TYPE=CELL:+33600000000\r\nEMAIL:zoe@example.com\r\nORG:Studio;Design\r\nNOTE:Une longue \r\n note\r\nEND:VCARD",
  );
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].name, "Zoé Martin");
  assert.equal(contacts[0].phone, "+33600000000");
  assert.equal(contacts[0].company, "Studio");
  assert.equal(contacts[0].notes, "Une longue note");
});

test("détecte le format et ignore les doublons existants ou internes", () => {
  const imported = parseContactFile(
    "contacts.csv",
    "Name,Email,Phone\nAlice,ALICE@example.com,\nAlice bis,alice@example.com,\nBob,,+33 6 10 20 30 40",
  );
  const result = removeDuplicateContacts(imported, [{ email: null, phone: "+33 6 10 20 30 40" }]);
  assert.deepEqual(
    result.contacts.map(({ name }) => name),
    ["Alice"],
  );
  assert.equal(result.duplicates, 2);
});

test("reconnaît les colonnes d'un export Google Contacts", () => {
  const [contact] = parseCsvContacts(
    "Given Name,Family Name,E-mail 1 - Value,Phone 1 - Value,Organization 1 - Name,Organization 1 - Title,Address 1 - Formatted\nMia,Rakoto,mia@example.com,+261340000000,Cadence,CEO,Antananarivo",
  );
  assert.deepEqual(contact, {
    name: "Mia Rakoto",
    email: "mia@example.com",
    phone: "+261340000000",
    company: "Cadence",
    role_title: "CEO",
    address: "Antananarivo",
    birthday: null,
    notes: null,
  });
});
