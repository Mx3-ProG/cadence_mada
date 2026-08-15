import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");

test("hosted auth config disables native signup confirmation and uses Cadence SMTP", () => {
  assert.match(config, /\[auth\.email\][\s\S]*enable_confirmations = false/);
  assert.match(config, /host = "smtp\.resend\.com"/);
  assert.match(config, /admin_email = "rdv@cadencemada\.com"/);
});

test("Google OAuth reads credentials from uncommitted environment variables", () => {
  assert.match(config, /\[auth\.external\.google\][\s\S]*enabled = true/);
  assert.match(config, /client_id = "env\(GOOGLE_OAUTH_CLIENT_ID\)"/);
  assert.match(config, /secret = "env\(GOOGLE_OAUTH_CLIENT_SECRET\)"/);
  assert.doesNotMatch(config, /client_secret_[A-Za-z0-9]/);
});
