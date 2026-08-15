import assert from "node:assert/strict";
import test from "node:test";
import { displayNameSchema } from "../src/lib/auth-validation.ts";

test("the first signup requires an explicit full name or nickname", () => {
  for (const invalid of ["", "   ", "x", "x".repeat(81)]) {
    assert.equal(displayNameSchema.safeParse(invalid).success, false);
  }
  assert.equal(displayNameSchema.parse("  Alex  "), "Alex");
  assert.equal(displayNameSchema.parse("MadaPro"), "MadaPro");
});
