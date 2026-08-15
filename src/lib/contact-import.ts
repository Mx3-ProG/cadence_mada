export type ImportedContact = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role_title: string | null;
  address: string | null;
  birthday: string | null;
  notes: string | null;
};

type CsvRow = Record<string, string>;

const HEADER_ALIASES = {
  name: ["name", "full name", "display name", "nom", "nom complet"],
  firstName: ["first name", "given name", "prenom", "prénom"],
  lastName: ["last name", "family name", "surname", "nom de famille"],
  email: ["email", "e-mail", "email address", "e-mail address", "e-mail 1 - value", "courriel"],
  phone: [
    "phone",
    "phone number",
    "mobile",
    "mobile phone",
    "phone 1 - value",
    "business phone",
    "telephone",
    "téléphone",
  ],
  company: [
    "company",
    "organization",
    "organization 1 - name",
    "organisation",
    "societe",
    "société",
  ],
  role: ["job title", "title", "organization 1 - title", "role", "poste", "fonction"],
  address: ["address", "street address", "address 1 - formatted", "adresse"],
  birthday: ["birthday", "birth date", "date of birth", "anniversaire", "date de naissance"],
  notes: ["notes", "note", "comments", "commentaires"],
} as const;

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function clean(value: string | undefined, max: number): string | null {
  const result = value?.trim().slice(0, max);
  return result ? result : null;
}

function findValue(row: CsvRow, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value?.trim()) return value;
  }
  return "";
}

function detectDelimiter(line: string) {
  const delimiters = [",", ";", "\t"];
  let selected = ",";
  let max = -1;
  for (const delimiter of delimiters) {
    let count = 0;
    let quoted = false;
    for (const character of line) {
      if (character === '"') quoted = !quoted;
      else if (character === delimiter && !quoted) count += 1;
    }
    if (count > max) {
      selected = delimiter;
      max = count;
    }
  }
  return selected;
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

export function parseCsvContacts(text: string): ImportedContact[] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const rows = parseDelimited(text, detectDelimiter(firstLine));
  const headers = (rows.shift() ?? []).map(normalizeHeader);
  if (!headers.length) return [];

  return rows.flatMap((values) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    const firstName = findValue(row, HEADER_ALIASES.firstName);
    const lastName = findValue(row, HEADER_ALIASES.lastName);
    const name = clean(findValue(row, HEADER_ALIASES.name) || `${firstName} ${lastName}`, 120);
    if (!name) return [];
    return [
      {
        name,
        email: clean(findValue(row, HEADER_ALIASES.email), 255),
        phone: clean(findValue(row, HEADER_ALIASES.phone), 40),
        company: clean(findValue(row, HEADER_ALIASES.company), 120),
        role_title: clean(findValue(row, HEADER_ALIASES.role), 120),
        address: clean(findValue(row, HEADER_ALIASES.address), 250),
        birthday: normalizeDate(findValue(row, HEADER_ALIASES.birthday)),
        notes: clean(findValue(row, HEADER_ALIASES.notes), 4000),
      },
    ];
  });
}

function unescapeVCard(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function vCardValue(lines: string[], property: string) {
  const prefix = `${property.toUpperCase()}`;
  const line = lines.find((candidate) => {
    const key = candidate.split(":", 1)[0]?.toUpperCase() ?? "";
    return key === prefix || key.startsWith(`${prefix};`);
  });
  if (!line) return "";
  return unescapeVCard(line.slice(line.indexOf(":") + 1));
}

export function parseVCardContacts(text: string): ImportedContact[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const cards = unfolded.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) ?? [];
  return cards.flatMap((card) => {
    const lines = card.split(/\r?\n/);
    const structuredName = vCardValue(lines, "N").split(";");
    const name = clean(
      vCardValue(lines, "FN") || [structuredName[1], structuredName[0]].filter(Boolean).join(" "),
      120,
    );
    if (!name) return [];
    const organization = vCardValue(lines, "ORG").split(";")[0] ?? "";
    const rawAddress = vCardValue(lines, "ADR");
    const address = rawAddress ? rawAddress.split(";").filter(Boolean).join(", ") : "";
    return [
      {
        name,
        email: clean(vCardValue(lines, "EMAIL"), 255),
        phone: clean(vCardValue(lines, "TEL"), 40),
        company: clean(organization, 120),
        role_title: clean(vCardValue(lines, "TITLE"), 120),
        address: clean(address, 250),
        birthday: normalizeDate(vCardValue(lines, "BDAY")),
        notes: clean(vCardValue(lines, "NOTE"), 4000),
      },
    ];
  });
}

export function parseContactFile(name: string, text: string): ImportedContact[] {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "vcf" || /BEGIN:VCARD/i.test(text)) return parseVCardContacts(text);
  if (extension === "csv") return parseCsvContacts(text);
  throw new Error("Format non pris en charge. Utilise un fichier CSV ou VCF.");
}

function normalizedEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizedPhone(value: string | null | undefined) {
  return value?.replace(/[^\d+]/g, "").replace(/^00/, "+") ?? "";
}

export function removeDuplicateContacts(
  imported: ImportedContact[],
  existing: Array<{ email: string | null; phone: string | null }>,
) {
  const emails = new Set(existing.map((contact) => normalizedEmail(contact.email)).filter(Boolean));
  const phones = new Set(existing.map((contact) => normalizedPhone(contact.phone)).filter(Boolean));
  let duplicates = 0;
  const contacts = imported.filter((contact) => {
    const email = normalizedEmail(contact.email);
    const phone = normalizedPhone(contact.phone);
    if ((email && emails.has(email)) || (phone && phones.has(phone))) {
      duplicates += 1;
      return false;
    }
    if (email) emails.add(email);
    if (phone) phones.add(phone);
    return true;
  });
  return { contacts, duplicates };
}
