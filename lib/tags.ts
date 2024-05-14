import type Opaque from "ts-opaque";

const variant = Symbol("$$variant");
const internal = Symbol("$$internal");
const empty = Symbol("$$empty");
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
> = Opaque<BaseTag<true, Empty, Variant, VariantName, false>>;
export type Tag<
  Variant extends symbol,
  VariantName extends string,
  T,
  Unwrappable extends boolean = false
> = Opaque<BaseTag<false, T, Variant, VariantName, Unwrappable>>;

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

export type Tagger<TagType extends AnyTag> = TagConstructor<TagType> &
  Opaque<{
    [variant]: TagType[typeof variant];
  }>;

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
  const identifier = Symbol(variantName);
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
  type BaseTagger = typeof tag;
  return Object.assign(
    () => tag(empty) as UnitTag<BaseTagger[typeof variant], Name>,
    {
      [variant]: tag[variant],
    }
  ) as Tagger<UnitTag<BaseTagger[typeof variant], Name>>;
}

/**
 * Only mark a single vaiant as unwrappable
 */
export function createTagType<
  Name extends string,
  Unwrappable extends boolean = false
>(typeName: Name, unwrappable?: Unwrappable) {
  const tag = createBaseTagger(typeName, unwrappable);
  type BaseTagger = typeof tag;
  const tagger = <T>(value: T) => {
    return tag(value) as unknown as Tag<
      BaseTagger[typeof variant],
      Name,
      T,
      Unwrappable
    >;
  };
  return Object.assign(tagger, {
    [variant]: tag[variant],
  }) as typeof tagger extends (value: infer V) => any
    ? Tagger<Tag<BaseTagger[typeof variant], Name, V, Unwrappable>>
    : never;
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

export type HasUnit<T extends AnyTag> = T extends UnitTag<any, any>
  ? true
  : false;

export function isUnit<T extends AnyTag>(t: T) {
  return t[empty];
}

export function isUnwrappable(t: unknown): t is Tag<any, any, unknown, true> {
  if (!t) return false;
  if (typeof t !== "object" || !(unwrap in t)) return false;
  return t[unwrap] === true;
}

export type Unwrapped<T extends AnyTag> = T extends Tag<any, any, infer V, true>
  ? V
  : never;

export type Unwrappable<T extends AnyTag> = T extends Tag<any, any, any, true>
  ? T
  : never;

export type ExcludeUnwrappable<T extends AnyTag> = T extends Tag<
  any,
  any,
  any,
  true
>
  ? never
  : T;

export function unsafe_copyWith<T extends Tag<any, any, any, any>, R>(
  base: T,
  value: R
): T extends Tag<infer V, infer N, any, infer U> ? Tag<V, N, R, U> : never {
  return { ...base, [internal]: value } as unknown as T extends Tag<
    infer V,
    infer N,
    any,
    infer U
  >
    ? Tag<V, N, R, U>
    : never;
}
