import { describe, it, test, expect } from "bun:test";
import * as tasks from "./tasks";
import { expectType } from "./test-utils";
import { unsafe_unwrap } from "./tags";
import { type UnhandledException } from "./exception";
import { panic } from "./result";
import { or, orFn } from "./ops";

describe("Task", () => {
  describe("static methods", () => {
    test("Task.resolved creates a resolved Task", async () => {
      const t = tasks.Task.resolved(5);

      expectType<tasks.Task<number, never>>(t);
      const value = await t.settled();
      expectType<tasks.Async<number, never>>(value);

      expect(unsafe_unwrap(value)).toBe(5);
    });

    test("Task.rejected creates a rejected Task", async () => {
      const t = tasks.Task.rejected(5);

      expectType<tasks.Task<never, number>>(t);
      const value = await t.settled();
      expectType<tasks.Async<never, number>>(value);

      expect(unsafe_unwrap(value)).toBe(5);
    });

    describe("Task.fromPromise", () => {
      it("Works with happy case", async () => {
        const t = tasks.Task.fromPromise(Promise.resolve(5));

        expectType<tasks.Task<number, UnhandledException>>(t);

        const value = await t.settled();
        expectType<tasks.Async<number, UnhandledException>>(value);

        expect(unsafe_unwrap(value)).toBe(5);
      });

      it("Works with sad case", async () => {
        const t = tasks.Task.fromPromise(
          Promise.reject(5) as Promise<string>,
          (error: unknown) => {
            if (typeof error === "number") {
              return error;
            }
            return panic(error);
          }
        );

        expectType<tasks.Task<string, number>>(t);

        const value = await t.settled();
        expectType<tasks.Async<string, number>>(value);

        expect(unsafe_unwrap(value)).toBe(5);
      });
    });
  });
  describe("<constructor>", () => {
    it("creates a pending task", () => {
      const t = new tasks.Task();

      expect(t.isPending()).toBeTrue();
      expect(t.isResolved()).toBeFalse();
      expect(t.isRejected()).toBeFalse();
    });
  });

  it("can be manually resolved", () => {
    const t = new tasks.Task<number, string>();

    t.resolve(5);

    expect(t.isPending()).toBeFalse();
    expect(t.isResolved()).toBeTrue();
    expect(t.isRejected()).toBeFalse();
  });

  it("can be manually rejected", () => {
    const t = new tasks.Task<number, string>();

    t.reject("5");

    expect(t.isPending()).toBeFalse();
    expect(t.isResolved()).toBeFalse();
    expect(t.isRejected()).toBeTrue();
  });

  it("has immutable internal state after settling", () => {
    const t = new tasks.Task<number, string>();

    t.resolve(5);
    t.reject("5");
    t.resolve(6);

    expect(unsafe_unwrap(t.state)).toBe(5);
  });

  it("can be mapped", async () => {
    const t1 = new tasks.Task<number, string>();
    const t2 = t1.map((v) => v > 0);

    expectType<tasks.Task<boolean, string>>(t2);
    t1.resolve(-4);

    await t2.settled();

    expect(unsafe_unwrap(t2.state)).toBe(false);
  });

  it("can be flat-mapped", async () => {
    const t1 = new tasks.Task<number, string>();
    const t2 = t1.flatMap((v) => tasks.Task.resolved(v > 0));

    expectType<tasks.Task<boolean, string>>(t2);
    t1.resolve(-4);

    await t2.settled();

    expect(unsafe_unwrap(t2.state)).toBe(false);
  });

  it("can be handled with ops", () => {
    const t1 = new tasks.Task<number, string>();
    const t2 = new tasks.Task<number, string>();

    expect(or(t1.state, -1)).toBe(-1);
    expect(
      orFn(t1.state, (_, value) =>
        or(value, "pending") === "pending" ? -2 : -3
      )
    ).toBe(-2);

    t1.resolve(4);
    expect(or(t1.state, -1)).toBe(4);
    expect(
      orFn(t1.state, (_, value) =>
        or(value, "pending") === "pending" ? -2 : -3
      )
    ).toBe(4);

    t2.reject('foo');
    expect(or(t2.state, -1)).toBe(-1);
    expect(
      orFn(t2.state, (_, value) =>
        or(value, "pending") === "pending" ? -2 : -3
      )
    ).toBe(-3);
  });
});
