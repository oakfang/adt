const variant: unique symbol = Symbol("$$variant");
const internal: unique symbol = Symbol("$$internal");
const empty: unique symbol = Symbol("$$empty");
const unwrap = Symbol("$$unwrap");

type Empty = typeof empty;

type BaseTag<
  Unit extends boolean,
  T,
  Variant extends symbol,
  VariantName extends string,
  Unwrappable extends boolean
> = Readonly<{
  __private_variant: VariantName;
  __private_unwrappable: Unwrappable;
  [unwrap]: Unwrappable;
  [variant]: Variant;
  [internal]: T;
  [empty]: Unit;
  [Symbol.toStringTag]: string;
}>;

const variantsRegistry = new WeakMap<symbol, string>();

export type UnitTag<
  Variant extends symbol,
  VariantName extends string
> = BaseTag<true, Empty, Variant, VariantName, false>;
export type Tag<
  Variant extends symbol,
  VariantName extends string,
  T,
  Unwrappable extends boolean = false
> = BaseTag<false, T, Variant, VariantName, Unwrappable>;

export type AnyTag =
  | UnitTag<symbol, string>
  | Tag<symbol, string, any, boolean>;

type TagConstructor<T extends AnyTag> = T extends Tag<
  infer S extends symbol,
  infer N,
  any,
  infer Unwrappable
>
  ? <A>(value: A) => Tag<S, N, A, Unwrappable>
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
    : k extends Tag<infer Variant, infer Name, infer Value, infer Unwrap>
    ? (value: Value) => Tag<Variant, Name, Value, Unwrap>
    : never;
}[T["__private_variant"]];

function createBaseTagger<
  Name extends string,
  Unwrappable extends boolean = false
>(variantName: Name, unwrappable?: Unwrappable) {
  const identifier: unique symbol = Symbol(variantName);
  variantsRegistry.set(identifier, variantName);
  function tag<T>(
    value: T
  ): BaseTag<
    T extends Empty ? true : false,
    T,
    typeof identifier,
    Name,
    Unwrappable
  > {
    return {
      [unwrap]: unwrappable === true,
      [variant]: identifier,
      [internal]: value,
      [empty]: value === empty,
      [Symbol.toStringTag]:
        variantName + (value === empty ? "()" : `(${value})`),
      [Symbol.for("nodejs.util.inspect.custom")]: () =>
        `<${variantName + (value === empty ? "()" : `(${value})`)}>`,
    } as BaseTag<
      T extends Empty ? true : false,
      T,
      typeof identifier,
      Name,
      Unwrappable
    >;
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

/**
 * Only mark a single vaiant as unwrappable
 */
export function createTagType<
  Name extends string,
  Unwrappable extends boolean = false
>(typeName: Name, unwrappable?: Unwrappable) {
  const tag = createBaseTagger(typeName, unwrappable);
  type Tagger = typeof tag;
  return Object.assign(
    <T>(value: T) => {
      return tag(value) as Tag<Tagger[typeof variant], Name, T, Unwrappable>;
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
): T extends Tag<any, any, infer U, any> ? U : never {
  if (tag[empty]) {
    throw new Error("Cannot unwrap empty tag");
  }
  return tag[internal];
}

export function unsafe_getVariant<T extends { [variant]: symbol }>(object: T) {
  return object[variant];
}

export function isUnit<T extends AnyTag>(t: T) {
  return t[empty];
}

export function isUnwrappable<T extends AnyTag>(t: T) {
  return t[unwrap];
}

export type Unwrapped<T extends AnyTag> = T extends Tag<any, any, infer V, true>
  ? V
  : never;

export type ExcludeUnwrappable<T extends AnyTag> = T extends Tag<
  any,
  any,
  any,
  true
>
  ? never
  : T;
