import { describe, it, test, expect } from "bun:test";
import * as tasks from "./tasks";
import { expectType } from "./test-utils";
import { unsafe_unwrap } from "./tags";
import { type UnhandledException } from "./exception";
import { panic } from "./result";

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
});
