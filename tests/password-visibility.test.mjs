import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const [passwordInput, auth, resetPassword, accountSettings] = await Promise.all([
  readFile(new URL("src/components/ui/password-input.tsx", root), "utf8"),
  readFile(new URL("src/routes/$locale/auth.tsx", root), "utf8"),
  readFile(new URL("src/routes/$locale/reset-password.tsx", root), "utf8"),
  readFile(new URL("src/components/agenda/account-settings.tsx", root), "utf8"),
]);

test("PasswordInput toggles between masked and visible text", () => {
  assert.match(passwordInput, /type=\{visible \? "text" : "password"\}/);
  assert.match(passwordInput, /setVisible\(\(value\) => !value\)/);
  assert.match(passwordInput, /aria-pressed=\{visible\}/);
  assert.match(passwordInput, /Afficher \$\{visibilityLabel\}/);
  assert.match(passwordInput, /Masquer \$\{visibilityLabel\}/);
});

test("all account password flows use the visibility control", () => {
  assert.equal((auth.match(/<PasswordInput/g) ?? []).length, 2);
  assert.equal((resetPassword.match(/<PasswordInput/g) ?? []).length, 2);
  assert.equal((accountSettings.match(/<PasswordInput/g) ?? []).length, 2);

  for (const source of [auth, resetPassword, accountSettings]) {
    assert.doesNotMatch(source, /<Input[\s\S]{0,160}type="password"/);
  }
});
