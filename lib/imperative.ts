import { some } from "./option";
import {
  unsafe_getVariant,
  unsafe_unwrap,
  type AnyTag,
  type Tag,
  type Tagger,
} from "./tags";

const imperativeRegistry = new WeakSet<symbol>();

export function addTagTypeToImperativeRegistry<T extends Tag<any, any, any>>(
  tagType: Tagger<T>
) {
  imperativeRegistry.add(unsafe_getVariant(tagType));
}

function isTagInImperativeRegistry<T extends AnyTag>(tag: T) {
  return imperativeRegistry.has(unsafe_getVariant(tag));
}

function* unwrap<T extends Tag<any, any, any>>(tag: T) {
  if (isTagInImperativeRegistry(tag)) {
    yield unsafe_unwrap(tag);
  } else {
    throw tag;
  }
}

addTagTypeToImperativeRegistry(some)

const t = (function* T1() {
  const x = yield* unwrap(some(4));
  console.log(x);
})();

console.log(t.next());
t.next(3)

// function test<T extends Tag<any, any, any>>(gen: Generator<T, any, any>) {}

// test(function* () {
//   yield 4;
// });
