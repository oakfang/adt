import {
  type AnyTag,
  type TaggerOf,
  type Tagger,
  isTagOfType,
  unsafe_unwrap,
  isUnit,
} from "./tags";

type Mapper<T extends AnyTag, Tgr extends TaggerOf<T>, R> = Tgr extends (
  ...args: any[]
) => any
  ? (...args: Parameters<Tgr>) => R
  : never;
type Matcher<T extends AnyTag, R> =
  | {
      [k in TaggerOf<T> as "_"]: [k, Mapper<T, k, R>];
    }["_"]
  | [null, () => R];

interface MatcherBuilder<T extends AnyTag, Return> {
  assert: () => Return;
  when: <R, Tgr extends TaggerOf<T>>(
    tagger: Tgr,
    callback: Mapper<T, Tgr, R>
  ) => MatcherBuilder<T, Return | R>;
  else: <R>(callback: () => R) => MatcherBuilder<T, Return | R>;
}

function createMatcher<T extends AnyTag, Current>(
  tag: T,
  matchers: Array<Matcher<T, Current>>
): MatcherBuilder<T, Current> {
  return {
    assert(): Current {
      for (const matcher of matchers) {
        const [tagger, mapper] = matcher as
          | [Tagger<T>, Mapper<T, TaggerOf<T>, Current>]
          | [null, () => Current];
        if (tagger === null) {
          return mapper();
        }
        if (isTagOfType(tag, tagger)) {
          if (isUnit(tag)) return mapper();
          const value = unsafe_unwrap(tag);
          //   @ts-expect-error
          return mapper(value);
        }
      }
      throw new Error("No matcher found");
    },
    when: <R, Tgr extends TaggerOf<T>>(
      tagger: Tgr,
      callback: Mapper<T, Tgr, R>
    ): MatcherBuilder<T, Current | R> => {
      const matcher = [tagger, callback] as Matcher<T, R>;
      return createMatcher<T, Current | R>(tag, [...matchers, matcher]);
    },
    else: <R>(callback: () => R) => {
      const matcher = [null, callback] as Matcher<T, R>;
      return createMatcher<T, Current | R>(tag, [...matchers, matcher]);
    },
  };
}

export function match<T extends AnyTag>(tag: T) {
  return createMatcher<T, never>(tag, []);
}
