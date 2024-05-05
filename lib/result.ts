import {
  raise,
  type UnhandledException,
  type getErrorTypeFromMapper,
} from "./exception";
import { isNone, none, some, type Option } from "./option";
import { createTagType, isTagOfType, unsafe_unwrap } from "./tags";

export const error = createTagType("left");
export const ok = createTagType("right", true);
export type Error<Left> = ReturnType<typeof error<Left>>;
export type Ok<Right> = ReturnType<typeof ok<Right>>;
export type Result<Left, Right> = Error<Left> | Ok<Right>;

export const isError = <Res extends Result<any, any>>(
  result: unknown
): result is Error<Res extends Result<infer Left, any> ? Left : unknown> =>
  isTagOfType(result, error);
function getError<Left = unknown>(result: unknown): Option<Left> {
  if (isError(result)) {
    return some(unsafe_unwrap(result));
  }
  return none();
}
export const isOk = <Res extends Result<any, any>>(
  result: unknown
): result is Ok<Res extends Result<any, infer Right> ? Right : unknown> =>
  isTagOfType(result, ok);
function getOk<Right = unknown>(result: unknown): Option<Right> {
  if (isOk(result)) {
    return some(unsafe_unwrap(result));
  }
  return none();
}

export function panic(error?: unknown) {
  if (error) throw error;
  return null as never;
}

export function attempt<
  T,
  ErrorMapper extends ((error: unknown) => any) | undefined = undefined
>(
  fn: () => T,
  errorMapper?: ErrorMapper
): Result<getErrorTypeFromMapper<ErrorMapper>, T> {
  try {
    return ok(fn());
  } catch (e) {
    if (errorMapper) {
      return error(errorMapper(e));
    }
    return error(raise(e)) as Result<getErrorTypeFromMapper<ErrorMapper>, T>;
  }
}

type getRight<R extends Result<any, any>> = R extends Ok<infer Right>
  ? Right
  : never;
type getLeft<R extends Result<any, any>> = R extends Error<infer Left>
  ? Left
  : never;

export function map<R extends Result<any, any>, MappedTo>(
  result: R,
  mapper: (value: getRight<R>) => MappedTo
): Result<getLeft<R>, MappedTo> {
  const err = getError<getLeft<R>>(result);
  if (!isNone(err)) {
    return error(unsafe_unwrap(err));
  }

  const value = getOk<getRight<R>>(result);
  if (!isNone(value)) {
    return ok(mapper(unsafe_unwrap(value)));
  }

  throw new Error("Type error, not a result type");
}

export function flatMap<
  InResult extends Result<any, any>,
  OutResult extends Result<any, any>
>(
  result: InResult,
  mapper: (value: getRight<InResult>) => OutResult
): Result<getLeft<InResult> | getLeft<OutResult>, getRight<OutResult>> {
  const mapped = map(result, mapper);

  const err = getError<getLeft<InResult>>(mapped);
  if (!isNone(err)) {
    return error(unsafe_unwrap(err));
  }

  const value = getOk<Result<getLeft<OutResult>, getRight<OutResult>>>(mapped);
  if (!isNone(value)) {
    const unwrapped = unsafe_unwrap(value);
    const err2 = getError<getLeft<OutResult>>(unwrapped);
    if (!isNone(err2)) {
      return error(unsafe_unwrap(err2));
    }
    const value2 = getOk<getRight<OutResult>>(unwrapped);
    if (!isNone(value2)) {
      return ok(unsafe_unwrap(value2));
    }
  }

  throw new Error("Type error, not a result type");
}

export function handle<R extends Result<any, any>>(
  result: R,
  handler: (error: getLeft<R>) => getRight<R>
): getRight<R> {
  const err = getError<getLeft<R>>(result);
  if (!isNone(err)) {
    return handler(unsafe_unwrap(err));
  }

  const value = getOk<getRight<R>>(result);
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
