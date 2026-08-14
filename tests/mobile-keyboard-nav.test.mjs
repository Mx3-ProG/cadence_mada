import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const [appHeader, styles] = await Promise.all([
  readFile(new URL("src/components/agenda/app-header.tsx", root), "utf8"),
  readFile(new URL("src/styles.css", root), "utf8"),
]);

test("the mobile nav follows the real visual viewport keyboard state", () => {
  assert.match(appHeader, /window\.visualViewport/);
  assert.match(appHeader, /baselineHeight - viewport\.height/);
  assert.match(appHeader, /MOBILE_KEYBOARD_MIN_HEIGHT/);
  assert.match(appHeader, /viewport\?\.addEventListener\("resize", scheduleUpdate\)/);
  assert.match(appHeader, /viewport\?\.removeEventListener\("resize", scheduleUpdate\)/);
});

test("the mobile nav leaves the viewport while the keyboard is open", () => {
  assert.match(appHeader, /data-mobile-nav/);
  assert.match(appHeader, /pointer-events-none translate-y-full opacity-0/);
  assert.match(appHeader, /aria-hidden=\{mobileKeyboardOpen\}/);
  assert.match(appHeader, /data-mobile-keyboard-open/);
  assert.match(styles, /:root\[data-mobile-keyboard-open\] body/);
});
