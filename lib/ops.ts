import {
  isUnwrappable,
  unsafe_copyWith,
  unsafe_unwrap,
  type AnyTag,
  type ExcludeUnwrappable,
  type Tag,
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
