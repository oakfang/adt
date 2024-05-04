import { raise, type UnhandledException } from "./exception";
import {
  createTagType,
  createUnitType,
  isTagOfType,
  unsafe_unwrap,
} from "./tags";

export const pending = createUnitType("pending");
export const isPending = (async: unknown): async is Pending =>
  isTagOfType(async, pending);

export const resolved = createTagType("resolved");
export const isResolved = <T>(async: unknown): async is Resolved<T> =>
  isTagOfType(async, resolved);

export const rejected = createTagType("rejected");
export const isRejected = <E>(async: unknown): async is Rejected<E> =>
  isTagOfType(async, rejected);

export type Pending = ReturnType<typeof pending>;
export type Resolved<T> = ReturnType<typeof resolved<T>>;
export type Rejected<E> = ReturnType<typeof rejected<E>>;
export type Async<T, E> = Pending | Resolved<T> | Rejected<E>;

export type Tas4k<T, E> = {
  readonly state: Async<T, E>;
  isPending(): boolean;
  isResolved(): boolean;
  isRejected(): boolean;
  join(): Promise<Async<T, E>>;
  resolve(value: T): void;
  reject(error: E): void;
  map<R>(mapper: (value: T) => R): Task<R, E>;
  flatMap<R, E2>(mapper: (value: T) => Task<R, E2>): Task<R, E | E2>;
};

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

  static fromPromise<ResolvesTo, ErrorMapper extends (error: unknown) => any>(
    promise: Promise<ResolvesTo>,
    errorMapper?: ErrorMapper
  ): Task<
    ResolvesTo,
    ErrorMapper extends (error: unknown) => infer E ? E : UnhandledException
  > {
    const t = new Task<
      ResolvesTo,
      ErrorMapper extends (error: unknown) => infer E ? E : UnhandledException
    >();

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
        await this.settled();
        if (isPending(this.#state)) {
          // This never happens
          throw null;
        }
        if (!isResolved(this.#state)) {
          throw unsafe_unwrap(this.#state);
        }
        return mapper(unsafe_unwrap(this.#state));
      })()
    );
  }

  flatMap<ResolvedTo2, RejectedBy2>(
    mapper: (value: ResolvesTo) => Task<ResolvedTo2, RejectedBy2>
  ): Task<ResolvedTo2, RejectedBy | RejectedBy2> {
    return Task.fromPromise(
      (async () => {
        await this.settled();
        if (isPending(this.#state)) {
          // This never happens
          throw null;
        }
        if (!isResolved(this.#state)) {
          throw unsafe_unwrap(this.#state);
        }
        const subtask = mapper(unsafe_unwrap(this.#state));
        await subtask.settled();
        if (isPending(subtask.state)) {
          // This never happens
          throw null;
        }
        if (!isResolved(subtask.state)) {
          throw unsafe_unwrap(subtask.state);
        }
        return unsafe_unwrap(subtask.state);
      })()
    );
  }
}
