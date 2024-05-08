import { test, expect } from "bun:test";
import {
  type Option,
  fromNullable,
  getOrElse,
  isNone,
  none,
  some,
} from "./option";
import { map } from "./ops";
import { expectType } from "./test-utils";
import { unsafe_unwrap } from "./tags";

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

test("mapping it [none]", () => {
  const o = fromNullable<number>(null);
  const mappedO = map(o, (x) => x.toString());
  expectType<Option<string>>(mappedO);
  expect(isNone(mappedO)).toBeTrue();
});

test("mapping it [some<x>]", () => {
  const o = fromNullable(5);
  const mappedO = map(o, (x) => x.toString());
  expectType<Option<string>>(mappedO);
  expect(isNone(mappedO)).toBeFalse();
  expect(unsafe_unwrap(mappedO)).toBe("5");
});
