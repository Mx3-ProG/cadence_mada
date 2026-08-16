import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL(
    "../supabase/migrations/20260816110000_fix_public_appointment_invites.sql",
    import.meta.url,
  ),
  "utf8",
);
const inviteRoute = await readFile(
  new URL("../src/routes/invite.$token.tsx", import.meta.url),
  "utf8",
);

test("public invite RPC resolves individual invite tokens for every API role", () => {
  assert.match(
    migration,
    /FROM public\.appointment_invites i[\s\S]*WHERE i\.invite_token = _token/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.get_invite\(text\) TO anon, authenticated, service_role/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.respond_to_invite\(text, boolean, text, text\) TO anon, authenticated, service_role/,
  );
});

test("invite page does not present an RPC failure as an expired link", () => {
  assert.match(inviteRoute, /inviteQuery\.isError/);
  assert.match(inviteRoute, /!inviteQuery\.isError && !invite/);
  assert.match(inviteRoute, /inviteQuery\.refetch\(\)/);
});
