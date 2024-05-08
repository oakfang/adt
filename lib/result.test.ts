import { describe, it, expect } from "bun:test";
import * as result from "./result";
import type { UnhandledException } from "./exception";
import { expectType } from "./test-utils";
import { getOrElse } from "./option";
import { flatMap, map } from "./ops";
import { unsafe_unwrap } from "./tags";

describe("isError", () => {
  it("works with error<X>", () => {
    expect(result.isError(result.error(3))).toBeTrue();
  });
  it("works with ok<X>", () => {
    expect(result.isError(result.ok(3))).toBeFalse();
  });
});

describe("isOk", () => {
  it("works with error<X>", () => {
    expect(result.isOk(result.error(3))).toBeFalse();
  });
  it("works with ok<X>", () => {
    expect(result.isOk(result.ok(3))).toBeTrue();
  });
});

describe("panic", () => {
  it("throws when given a value", () => {
    expect(() => result.panic(4)).toThrow();
  });
  it("does not throw when given a nullable value", () => {
    expect(() => result.panic()).not.toThrow();
  });
});

describe("attempt", () => {
  it("works with no error", () => {
    const x = result.attempt(() => 5);

    expectType<result.Result<UnhandledException, number>>(x);
    expect(result.isOk(x)).toBe(true);
  });

  it("works with unhandled errors", () => {
    const x = result.attempt(() => {
      throw new Error();
    });

    expectType<result.Result<UnhandledException, never>>(x);
    expect(result.isError(x)).toBe(true);
  });

  it("works with handled errors", () => {
    const x = result.attempt(
      () => {
        throw new Error();
      },
      (error: unknown) => {
        if (error instanceof Error) return error;
        return result.panic(error);
      }
    );

    expectType<result.Result<Error, never>>(x);
    expect(result.isError(x)).toBe(true);
  });
});

describe("map", () => {
  it("works when ok", () => {
    const base = result.ok(3);
    expectType<result.Result<never, number>>(base);
    const x = map(base, (value) => value.toString());
    expectType<result.Result<never, string>>(x);
    expect(result.isOk(x)).toBeTrue();
  });

  it("works when error", () => {
    const base = result.attempt(
      (): string => {
        throw 0;
      },
      (error: unknown) => {
        if (Number.isFinite(error)) return error as number;
        return result.panic(error);
      }
    );
    expectType<result.Result<number, string>>(base);
    const x = map(base, (value) => value.split(""));
    expectType<result.Result<number, string[]>>(x);
    expect(result.isError(x)).toBeTrue();
  });
});

describe("flatMap", () => {
  it("works when ok -> ok", () => {
    const base = result.ok(3);
    expectType<result.Result<never, number>>(base);
    const x = flatMap(base, (value) => result.attempt(() => value.toString()));
    expectType<result.Result<UnhandledException, string>>(x);
    expect(result.isOk(x)).toBeTrue();
    expect(unsafe_unwrap(x)).toBe("3");
  });
  it("works when ok -> error", () => {
    const base = result.ok(3);
    expectType<result.Result<never, number>>(base);
    const x = flatMap(base, (value) =>
      result.attempt(() => {
        if (!value) return value.toString();
        throw new Error();
      })
    );
    expectType<result.Result<UnhandledException, string>>(x);
    expect(result.isError(x)).toBeTrue();
    const err = unsafe_unwrap(x);
    if (typeof err === "string") {
      return expect(err).fail();
    }
    expect(unsafe_unwrap(err)).toBeInstanceOf(Error);
  });

  it("works when error", () => {
    const base = result.attempt(
      (): string => {
        throw 0;
      },
      (error: unknown) => {
        if (Number.isFinite(error)) return error as number;
        return result.panic(error);
      }
    );
    expectType<result.Result<number, string>>(base);
    const x = flatMap(base, (value) => result.ok(value.split("")));
    expectType<result.Result<number, string[]>>(x);
    expect(result.isError(x)).toBeTrue();
  });
});

describe("handle", () => {
  it("works with ok", () => {
    expect(result.handle(result.ok(4), () => 0)).toBe(4);
  });

  it("works with error", () => {
    expect(
      result.handle(result.error(4) as result.Result<number, string>, (e) =>
        e.toString()
      )
    ).toBe("4");
  });
});

describe("rescue", () => {
  enum Test {
    Success,
    FailureWithCorrectType,
    FailureWithIncorrectType,
  }
  it("works with correct guard", () => {
    const base = result.attempt(() => {
      if (false) return Test.Success;
      throw Test.FailureWithCorrectType;
    });
    expectType<result.Result<UnhandledException, number>>(base);
    const extraction = result.handle(base, (e) =>
      getOrElse(
        result.rescue(e, (e): e is number => typeof e === "number"),
        Test.FailureWithIncorrectType
      )
    );
    expect(extraction).toBe(Test.FailureWithCorrectType);
  });

  it("works with wrong guard", () => {
    const base = result.attempt(() => {
      if (false) return Test.Success;
      throw "";
    });
    expectType<result.Result<UnhandledException, number>>(base);
    const extraction = result.handle(base, (e) =>
      getOrElse(
        result.rescue(e, (e): e is number => typeof e === "number"),
        Test.FailureWithIncorrectType
      )
    );
    expect(extraction).toBe(Test.FailureWithIncorrectType);
  });
});
