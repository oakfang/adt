import { none, some, type Option } from "./option";
import {
  isUnit,
  isUnwrappable,
  unsafe_copyWith,
  unsafe_unwrap,
  type AnyTag,
  type ExcludeUnwrappable,
  type HasUnit,
  type Tag,
  type UnitTag,
  type Unwrappable,
  type Unwrapped,
} from "./tags";

type MappedTag<T extends AnyTag, Value> =
  | ExcludeUnwrappable<T>
  | (T extends Tag<infer Var, infer Name, any, true>
      ? Tag<Var, Name, Value, true>
      : never);

export function map<T extends AnyTag, R>(
  t: T,
  mapper: (value: Unwrapped<T>) => R
): MappedTag<T, R> {
  if (isUnwrappable(t)) {
    const value = unsafe_unwrap(t) as Unwrapped<T>;
    const mappedValue = mapper(value);
    return unsafe_copyWith(t, mappedValue);
  }
  return t as ExcludeUnwrappable<T>;
}

type FlatMappedTag<T extends AnyTag, Value extends AnyTag> =
  | ExcludeUnwrappable<T>
  | ExcludeUnwrappable<Value>
  | (Value extends Tag<infer Var, infer Name, infer V, true>
      ? T extends Tag<Var, Name, any, boolean>
        ? Tag<Var, Name, V, true>
        : never
      : never);

export function flatMap<T extends AnyTag, R extends AnyTag>(
  t: T,
  mapper: (value: Unwrapped<T>) => R
): FlatMappedTag<T, R> {
  if (isUnwrappable(t)) {
    const value = unsafe_unwrap(t) as Unwrapped<T>;
    const mappedValue = mapper(value);
    return mappedValue as FlatMappedTag<T, R>;
  }
  return t as ExcludeUnwrappable<T>;
}

export function or<T extends AnyTag>(
  t: T,
  fallback: Unwrapped<T>
): Unwrapped<T> {
  if (isUnwrappable(t)) {
    const value = unsafe_unwrap(t) as Unwrapped<T>;
    return value;
  }
  return fallback;
}

export function orFn<T extends AnyTag>(
  t: T,
  fallbackFn: (
    tag: ExcludeUnwrappable<T>,
    value: Option<ReturnType<typeof unsafe_unwrap<ExcludeUnwrappable<T>>>>
  ) => Unwrapped<T>
): Unwrapped<T> {
  if (isUnwrappable(t)) {
    const value = unsafe_unwrap(t) as Unwrapped<T>;
    return value;
  }

  return fallbackFn(t as ExcludeUnwrappable<T>, unwrap(t));
}

export function handle<T extends AnyTag>(
  t: T,
  fallbackFn: (
    tag: ExcludeUnwrappable<T> extends UnitTag<any, any>
      ? never
      : ExcludeUnwrappable<T>,
    value: ReturnType<typeof unsafe_unwrap<ExcludeUnwrappable<T>>>
  ) => Unwrapped<T>
): Unwrapped<T> {
  return orFn(t, (tag, value) => {
    if (isUnit(tag)) throw new Error("Unit tag passed");
    return fallbackFn(
      tag as Exclude<ExcludeUnwrappable<T>, UnitTag<any, any>>,
      unsafe_unwrap(value)
    );
  });
}

export function unwrap<T extends AnyTag>(
  t: T
): Option<ReturnType<typeof unsafe_unwrap<T>>> {
  if (isUnit(t)) {
    return none();
  }
  return some(unsafe_unwrap(t));
}

export function mapElse<T extends AnyTag, R extends AnyTag>(
  t: T,
  callback: (tag: ExcludeUnwrappable<T>) => R
): Unwrappable<T> | R {
  if (isUnwrappable(t)) {
    return t as Unwrappable<T>;
  }
  return callback(t as ExcludeUnwrappable<T>);
}
