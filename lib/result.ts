import {
  raise,
  type UnhandledException,
  type getErrorTypeFromMapper,
} from "./exception";
import { none, some, type Option } from "./option";
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
export const isOk = <Res extends Result<any, any>>(
  result: unknown
): result is Ok<Res extends Result<any, infer Right> ? Right : unknown> =>
  isTagOfType(result, ok);

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

export function rescue<T>(
  exception: Error<UnhandledException>,
  guard: (value: unknown) => value is T
): Option<T> {
  const error = unsafe_unwrap(unsafe_unwrap(exception));
  if (guard(error)) {
    return some(error);
  }
  return none();
}
