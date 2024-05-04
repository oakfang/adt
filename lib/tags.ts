const variant: unique symbol = Symbol("$$variant");
const internal: unique symbol = Symbol("$$internal");
const empty: unique symbol = Symbol("$$empty");

type Empty = typeof empty;

type BaseTag<
  Unit extends boolean,
  T,
  Variant extends symbol,
  VariantName extends string
> = Readonly<{
  __private_variant: VariantName;
  [variant]: Variant;
  [internal]: T;
  [empty]: Unit;
  [Symbol.toStringTag]: string;
}>;

const variantsRegistry = new WeakMap<symbol, string>();

export type UnitTag<
  Variant extends symbol,
  VariantName extends string
> = BaseTag<true, Empty, Variant, VariantName>;
export type Tag<
  Variant extends symbol,
  VariantName extends string,
  T
> = BaseTag<false, T, Variant, VariantName>;

export type AnyTag = UnitTag<symbol, string> | Tag<symbol, string, any>;

type TagConstructor<T extends AnyTag> = T extends Tag<
  infer S extends symbol,
  infer N,
  any
>
  ? <A>(value: A) => Tag<S, N, A>
  : T extends UnitTag<infer S extends symbol, infer N>
  ? () => UnitTag<S, N>
  : never;

export type Tagger<TagType extends AnyTag> = TagConstructor<TagType> & {
  [variant]: TagType[typeof variant];
};

export type TaggerOf<T extends AnyTag> = {
  [k in T as k["__private_variant"]]: k extends UnitTag<
    infer Variant,
    infer Name
  >
    ? () => UnitTag<Variant, Name>
    : k extends Tag<infer Variant, infer Name, infer Value>
    ? (value: Value) => Tag<Variant, Name, Value>
    : never;
}[T["__private_variant"]];

function createBaseTagger<Name extends string>(variantName: Name) {
  const identifier: unique symbol = Symbol(variantName);
  variantsRegistry.set(identifier, variantName);
  function tag<T>(
    value: T
  ): BaseTag<T extends Empty ? true : false, T, typeof identifier, Name> {
    return {
      [variant]: identifier,
      [internal]: value,
      [empty]: value === empty,
      [Symbol.toStringTag]:
        variantName + (value === empty ? "()" : `(${value})`),
      [Symbol.for("nodejs.util.inspect.custom")]: () =>
        `<${variantName + (value === empty ? "()" : `(${value})`)}>`,
    } as BaseTag<T extends Empty ? true : false, T, typeof identifier, Name>;
  }

  return Object.assign(tag, { [variant]: identifier });
}

export function createUnitType<Name extends string>(typeName: Name) {
  const tag = createBaseTagger(typeName);
  type Tagger = typeof tag;
  return Object.assign(
    () => tag(empty) as UnitTag<Tagger[typeof variant], Name>,
    {
      [variant]: tag[variant],
    }
  );
}

export function createTagType<Name extends string>(typeName: Name) {
  const tag = createBaseTagger(typeName);
  type Tagger = typeof tag;
  return Object.assign(
    <T>(value: T) => {
      return tag(value) as Tag<Tagger[typeof variant], Name, T>;
    },
    {
      [variant]: tag[variant],
    }
  );
}

export function isTagOfType<T extends AnyTag>(
  tag: unknown,
  tagger: Tagger<T>
): tag is T {
  if (!(typeof tag === "object" && tag !== null && variant in tag)) {
    return false;
  }
  return tagger[variant] === tag[variant];
}

export function unsafe_unwrap<T extends AnyTag>(
  tag: T
): T extends Tag<any, any, infer U> ? U : never {
  if (tag[empty]) {
    throw new Error("Cannot unwrap empty tag");
  }
  return tag[internal];
}

export function unsafe_getVariant<T extends { [variant]: symbol }>(object: T) {
  return object[variant];
}
