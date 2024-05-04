import { raise, type UnhandledException } from "./exception";
import { isNone, none, some, type Option } from "./option";
import { createTagType, isTagOfType, unsafe_unwrap } from "./tags";

export const error = createTagType("left");
export const ok = createTagType("right");
export type Error<Left> = ReturnType<typeof error<Left>>;
export type Ok<Right> = ReturnType<typeof ok<Right>>;
export type Result<Left, Right> = Error<Left> | Ok<Right>;

export const isError = <Res extends Result<any, any>>(
  result: unknown
): result is Error<Res extends Result<infer Left, any> ? Left : unknown> =>
  isTagOfType(result, error);
export function getError<Left = unknown>(result: unknown): Option<Left> {
  if (isError(result)) {
    return some(unsafe_unwrap(result));
  }
  return none();
}
export const isOk = <Res extends Result<any, any>>(
  result: unknown
): result is Ok<Res extends Result<any, infer Right> ? Right : unknown> =>
  isTagOfType(result, ok);
export function getOk<Right = unknown>(result: unknown): Option<Right> {
  if (isOk(result)) {
    return some(unsafe_unwrap(result));
  }
  return none();
}

export function panic(error?: unknown) {
  if (error) throw error;
  return null as never;
}

export function attempt<T, ErrorMapper extends (error: unknown) => any>(
  fn: () => T,
  errorMapper?: ErrorMapper
): Result<
  ErrorMapper extends (error: unknown) => infer E ? E : UnhandledException,
  T
> {
  try {
    return ok(fn());
  } catch (e) {
    if (errorMapper) {
      return error(errorMapper(e));
    }
    return error(raise(e)) as Result<
      ErrorMapper extends (error: unknown) => infer E ? E : UnhandledException,
      T
    >;
  }
}

export function map<Left, Right, MappedTo>(
  result: Result<Left, Right>,
  mapper: (value: Right) => MappedTo
): Result<Left, MappedTo> {
  const err = getError<Left>(result);
  if (!isNone(err)) {
    return error(unsafe_unwrap(err));
  }

  const value = getOk<Right>(result);
  if (!isNone(value)) {
    return ok(mapper(unsafe_unwrap(value)));
  }

  throw new Error("Type error, not a result type");
}

export function flatMap<Left, Right, LeftM, RightM>(
  result: Result<Left, Right>,
  mapper: (value: Right) => Result<LeftM, RightM>
): Result<Left | LeftM, RightM> {
  const mapped = map(result, mapper);

  const err = getError<Left>(mapped);
  if (!isNone(err)) {
    return error(unsafe_unwrap(err));
  }

  const value = getOk<Result<LeftM, RightM>>(mapped);
  if (!isNone(value)) {
    const unwrapped = unsafe_unwrap(value);
    const err2 = getError<LeftM>(unwrapped);
    if (!isNone(err2)) {
      return error(unsafe_unwrap(err2));
    }
    const value2 = getOk<RightM>(unwrapped);
    if (!isNone(value2)) {
      return ok(unsafe_unwrap(value2));
    }
  }

  throw new Error("Type error, not a result type");
}

export function handle<Left, Right>(
  result: Result<Left, Right>,
  handler: (error: Left) => Right
): Right {
  const err = getError<Left>(result);
  if (!isNone(err)) {
    return handler(unsafe_unwrap(err));
  }

  const value = getOk<Right>(result);
  if (!isNone(value)) {
    return unsafe_unwrap(value);
  }

  throw new Error("Type error, not a result type");
}

export function rescue<T>(
  exception: UnhandledException,
  guard: (value: unknown) => value is T
): Option<T> {
  const error = unsafe_unwrap(exception);
  if (guard(error)) {
    return some(error);
  }
  return none();
}
