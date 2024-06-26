import { raise, type getErrorTypeFromMapper } from "./exception";
import { map } from "./ops";
import {
  createTagType,
  createUnitType,
  isTagOfType,
  unsafe_unwrap,
} from "./tags";

export const pending = createUnitType("pending");
export const isPending = (async: unknown): async is Pending =>
  isTagOfType(async, pending);

export const resolved = createTagType("resolved", true);
export const isResolved = <T>(async: unknown): async is Resolved<T> =>
  isTagOfType(async, resolved);

export const rejected = createTagType("rejected");
export const isRejected = <E>(async: unknown): async is Rejected<E> =>
  isTagOfType(async, rejected);

export type Pending = ReturnType<typeof pending>;
export type Resolved<T> = ReturnType<typeof resolved<T>>;
export type Rejected<E> = ReturnType<typeof rejected<E>>;
export type Async<T, E> = Pending | Resolved<T> | Rejected<E>;

// type getResolution<R extends Async<any, any>> = R extends Resolved<infer Right>
//   ? Right
//   : never;
// type getRejection<R extends Async<any, any>> = R extends Rejected<infer Left>
//   ? Left
//   : never;

// // export function handle<R extends Async<any, any>>(
// //   result: R,
// //   pendingHandler: () => getResolution<R>,
// //   errorHandler: (error: getRejection<R>) => getResolution<R>
// // ): getResolution<R> {
// //   if (isPending(result)) return pendingHandler();
// //   if (isRejected(result))
// //     return errorHandler(unsafe_unwrap(result as Rejected<getRejection<R>>));
// //   if (isResolved(result)) {
// //     return unsafe_unwrap(result) as getResolution<R>;
// //   }

// //   throw new Error("Type error, not a result type");
// // }

export class Task<ResolvesTo, RejectedBy> {
  #state: Async<ResolvesTo, RejectedBy> = pending();
  #subscribers = new Set<(state: Async<ResolvesTo, RejectedBy>) => void>();

  static resolved<ResolvesTo>(value: ResolvesTo) {
    const t = new Task<ResolvesTo, never>();
    t.resolve(value);
    return t;
  }

  static rejected<RejectedBy>(reason: RejectedBy) {
    const t = new Task<never, RejectedBy>();
    t.reject(reason);
    return t;
  }

  static fromPromise<
    ResolvesTo,
    ErrorMapper extends ((error: unknown) => any) | undefined = undefined
  >(
    promise: Promise<ResolvesTo>,
    errorMapper?: ErrorMapper
  ): Task<ResolvesTo, getErrorTypeFromMapper<ErrorMapper>> {
    const t = new Task<ResolvesTo, getErrorTypeFromMapper<ErrorMapper>>();

    promise.then(
      (value) => t.resolve(value),
      (error) => t.reject(errorMapper ? errorMapper(error) : raise(error))
    );

    return t;
  }

  #notify() {
    for (const subscriber of this.#subscribers) {
      subscriber(this.#state);
    }
    this.#subscribers.clear();
  }

  get state() {
    return this.#state;
  }

  isPending() {
    return isPending(this.#state);
  }

  isResolved() {
    return isResolved(this.#state);
  }

  isRejected() {
    return isRejected(this.#state);
  }

  settled() {
    if (!this.isPending()) return Promise.resolve(this.#state);
    return new Promise<Async<ResolvesTo, RejectedBy>>((resolve) => {
      this.#subscribers.add(resolve);
    });
  }

  resolve(value: ResolvesTo) {
    if (!this.isPending()) return;
    this.#state = resolved(value);
    this.#notify();
  }

  reject(error: RejectedBy) {
    if (!this.isPending()) return;
    this.#state = rejected(error);
    this.#notify();
  }

  map<Next>(mapper: (value: ResolvesTo) => Next): Task<Next, RejectedBy> {
    return Task.fromPromise(
      (async () => {
        const nextState = map(await this.settled(), mapper);
        if (isResolved(nextState)) return unsafe_unwrap(nextState);
        else throw unsafe_unwrap(nextState);
      })(),
      (error: unknown) => {
        return error as RejectedBy;
      }
    );
  }

  flatMap<ResolvedTo2, RejectedBy2>(
    mapper: (value: ResolvesTo) => Task<ResolvedTo2, RejectedBy2>
  ): Task<ResolvedTo2, RejectedBy | RejectedBy2> {
    return Task.fromPromise(
      (async () => {
        const nextState = map(await this.settled(), mapper);
        if (!isResolved(nextState)) {
          throw unsafe_unwrap(nextState);
        }
        const subtask = unsafe_unwrap(nextState);
        await subtask.settled();
        if (!isResolved(subtask.state)) {
          throw unsafe_unwrap(subtask.state);
        }
        return unsafe_unwrap(subtask.state);
      })(),
      (error: unknown) => {
        return error as RejectedBy | RejectedBy2;
      }
    );
  }
}
