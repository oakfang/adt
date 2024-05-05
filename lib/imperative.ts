import { error, ok, type Result } from "./result";
import {
  isUnwrappable,
  unsafe_unwrap,
  type AnyTag,
  type ExcludeUnwrappable,
  type Unwrapped,
} from "./tags";
import { Task } from "./tasks";

export function* unwrap<T extends AnyTag>(
  tag: T
): Generator<ExcludeUnwrappable<T> | null, Unwrapped<T>> {
  if (isUnwrappable(tag)) {
    const value = unsafe_unwrap(tag) as Unwrapped<T>;
    yield null;
    return value;
  } else {
    yield tag as ExcludeUnwrappable<T>;
    throw tag;
  }
}

export function run<E, R>(
  generator: () => Generator<E, R, any>
): Result<Exclude<E, null>, R> {
  const gen = generator();
  try {
    let res = gen.next();
    while (!res.done) {
      const tag = res.value;
      if (tag) gen.throw(tag);
      else {
        res = gen.next();
      }
    }
    return ok(res.value);
  } catch (tag) {
    return error(tag as Exclude<E, null>);
  }
}

export function runAsync<E, R>(
  generator: () => AsyncGenerator<E, R, any>
): Task<R, Exclude<E, null>> {
  const gen = generator();
  const task = new Task<R, Exclude<E, null>>();
  (async () => {
    let res = await gen.next();
    while (!res.done) {
      const tag = res.value;
      if (tag) return task.reject(tag as Exclude<E, null>);
      else {
        res = await gen.next();
      }
    }
    return task.resolve(res.value);
  })();

  return task;
}
