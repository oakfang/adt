import { describe, it, expect } from "bun:test";
import { expectType } from "./test-utils";
import * as adt from ".";

describe("run", () => {
  it("works for naive case", () => {
    const x = adt.imp.run(function* () {
      return 5;
    });

    expectType<adt.result.Result<never, number>>(x);
    expect(adt.tags.unsafe_unwrap(x)).toBe(5);
  });

  it("works for a complex case (happy)", () => {
    class DivisionByZeroError extends Error {}
    const div = (x: number, y: number) =>
      y ? adt.result.ok(x / y) : adt.result.error(new DivisionByZeroError());
    expectType<
      (x: number, y: number) => adt.result.Result<DivisionByZeroError, number>
    >(div);
    const x = adt.imp.run(function* () {
      const sourceOption = adt.option.fromNullable(4);
      const byOption = adt.option.fromNullable(2);
      const source = yield* adt.imp.unwrap(sourceOption);
      const by = yield* adt.imp.unwrap(byOption);
      const result = yield* adt.imp.unwrap(div(source, by));
      return result;
    });
    expectType<
      adt.result.Result<
        adt.option.None | adt.result.Error<DivisionByZeroError>,
        number
      >
    >(x);
    expect(adt.tags.unsafe_unwrap(x)).toBe(2);
  });

  it("works for a complex case (sad)", () => {
    class DivisionByZeroError extends Error {
      code = -5;
    }
    const div = (x: number, y: number) =>
      y ? adt.result.ok(x / y) : adt.result.error(new DivisionByZeroError());
    expectType<
      (x: number, y: number) => adt.result.Result<DivisionByZeroError, number>
    >(div);
    const x = adt.imp.run(function* () {
      const sourceOption = adt.option.fromNullable(4);
      const byOption = adt.option.fromNullable(0);
      const source = yield* adt.imp.unwrap(sourceOption);
      const by = yield* adt.imp.unwrap(byOption);
      const result = yield* adt.imp.unwrap(div(source, by));
      return result;
    });
    expectType<
      adt.result.Result<
        adt.option.None | adt.result.Error<DivisionByZeroError>,
        number
      >
    >(x);
    const result = adt.result.handle(x, (err) =>
      adt.option.isNone(err)
        ? -1
        : adt.result.handle<adt.result.Result<DivisionByZeroError, number>>(
            err,
            (e) => e.code
          )
    );
    expect(result).toBe(-5);
  });
});

describe("runAsync", () => {
  it("works for naive case", async () => {
    const x = adt.imp.runAsync(async function* () {
      return 5;
    });

    expectType<adt.tasks.Task<number, never>>(x);
    expect(adt.tags.unsafe_unwrap(await x.settled())).toBe(5);
  });

  it("works for a complex case (happy)", async () => {
    class DivisionByZeroError extends Error {}
    const div = (x: number, y: number) =>
      y ? adt.result.ok(x / y) : adt.result.error(new DivisionByZeroError());
    expectType<
      (x: number, y: number) => adt.result.Result<DivisionByZeroError, number>
    >(div);
    const x = adt.imp.runAsync(async function* () {
      const sourceTask = adt.tasks.Task.resolved(4);
      const byOption = adt.option.fromNullable(2);
      const source = yield* adt.imp.unwrap(await sourceTask.settled());
      const by = yield* adt.imp.unwrap(byOption);
      const result = yield* adt.imp.unwrap(div(source, by));
      return result;
    });
    expectType<
      adt.tasks.Task<
        number,
        | adt.option.None
        | adt.result.Error<DivisionByZeroError>
        | adt.tasks.Pending
        | adt.tasks.Rejected<never>
      >
    >(x);
    expect(adt.tags.unsafe_unwrap(await x.settled())).toBe(2);
  });

  it("works for a complex case (sad)", async () => {
    class DivisionByZeroError extends Error {
      code = -5;
    }
    const div = (x: number, y: number) =>
      y ? adt.result.ok(x / y) : adt.result.error(new DivisionByZeroError());
    expectType<
      (x: number, y: number) => adt.result.Result<DivisionByZeroError, number>
    >(div);
    const x = adt.imp.runAsync(async function* () {
      const sourceTask = adt.tasks.Task.resolved(4);
      const byOption = adt.option.fromNullable(0);
      const source = yield* adt.imp.unwrap(await sourceTask.settled());
      const by = yield* adt.imp.unwrap(byOption);
      const result = yield* adt.imp.unwrap(div(source, by));
      return result;
    });
    expectType<
      adt.tasks.Task<
        number,
        | adt.option.None
        | adt.result.Error<DivisionByZeroError>
        | adt.tasks.Pending
        | adt.tasks.Rejected<never>
      >
    >(x);

    const result = adt.tasks.handle(
      await x.settled(),
      () => -1,
      (err) =>
        adt.result.isError(err)
          ? adt.result.handle<adt.result.Result<DivisionByZeroError, number>>(
              err,
              (e) => e.code
            )
          : -1
    );
    expect(result).toBe(-5);
  });
});
