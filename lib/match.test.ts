import { test, expect } from "bun:test";
import { match } from "./match";
import { fromNullable, none, some } from "./option";
import { attempt, error, ok, panic } from "./result";

test("it matches on unit/tag adts", () => {
  const o = fromNullable(7);

  expect(
    match(o)
      .when(none, () => 0)
      .when(some<number>, (o) => o)
      .assert()
  ).toBe(7);
});

test("it matches on tag/tag adts", () => {
  const o = attempt(
    () => {
      return 7;
    },
    (err: unknown) => {
      if (typeof err === "string") return err;
      return panic(err);
    }
  );

  expect(
    match(o)
      .when(error<string>, () => 0)
      .when(ok<number>, (o) => o)
      .assert()
  ).toBe(7);
});

test("it falls back on else", () => {
  const o = fromNullable<number>(null);

  expect(
    match(o)
      .when(some<number>, (o) => o)
      .else(() => 0)
      .assert()
  ).toBe(0);
});
