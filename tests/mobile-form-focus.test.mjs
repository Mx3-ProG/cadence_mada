import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const [styles, rootRoute] = await Promise.all([
  readFile(new URL("src/styles.css", root), "utf8"),
  readFile(new URL("src/routes/__root.tsx", root), "utf8"),
]);

test("touch form fields keep a 16px font size to prevent iOS focus zoom", () => {
  assert.match(styles, /@media \(hover: none\) and \(pointer: coarse\)/);
  assert.match(styles, /input\[type="email"\]/);
  assert.match(styles, /input\[type="password"\]/);
  assert.match(styles, /input\[type="date"\]/);
  assert.match(styles, /input\[type="time"\]/);
  assert.match(styles, /textarea/);
  assert.match(styles, /font-size: 16px/);
});

test("the viewport keeps manual pinch zoom available", () => {
  assert.doesNotMatch(rootRoute, /maximum-scale/);
  assert.doesNotMatch(rootRoute, /user-scalable/);
});
