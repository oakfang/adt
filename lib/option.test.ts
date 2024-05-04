import { test, expect } from "bun:test";
import { fromNullable, getOrElse, isNone, none, some } from "./option";

test("Some<X> is not none", () => {
  const x = some(4);

  expect(isNone(x)).toBeFalse();
});

test("None is none", () => {
  const x = none();

  expect(isNone(x)).toBeTrue();
});

test("getOrElse (none)", () => {
  expect(getOrElse(none(), 6)).toBe(6);
});

test("getOrElse (some<x>)", () => {
  expect(getOrElse(some(2), 6)).toBe(2);
});

test("fromNullable", () => {
  expect(isNone(fromNullable(null))).toBeTrue();
  expect(isNone(fromNullable(undefined))).toBeTrue();
  expect(getOrElse(fromNullable(2), 4)).toBe(2);
});
