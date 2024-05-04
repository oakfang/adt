import {
  createTagType,
  createUnitType,
  isTagOfType,
  unsafe_unwrap,
} from "./tags";

export const some = createTagType("some");
export const none = createUnitType("none");
export type Some<T> = ReturnType<typeof some<T>>;
export type None = ReturnType<typeof none>;
export type Option<T> = Some<T> | None;

export const isNone = (option: Option<unknown>): option is None =>
  isTagOfType<None>(option, none);

export const getOrElse = <T>(option: Option<T>, defaultValue: T) =>
  isNone(option) ? defaultValue : unsafe_unwrap(option);

export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
  value === null || value === undefined ? none() : some(value);