# Algebraic Data Types for typescript

This is a somewhat naive implementation of ADTs for typescript.

## `option` - the "maybe" type module

### Main Exports

- `none(): None` create an instance of `Option<T>` that holds no value (unit type)
- `some<T>(value: T): Some<T>` create an instance of `Option<T>` that holds a value
- `type Option<T> = None | Option<T>`

### Utilities

- `isNone(value)` - is provided argument of type `None`
- `getOrElse<T>(option: Option<T>, default: T): T` - get an optional value if exists, fallback to default otherwise
- `fromNullable<T>(value: T | null | undefined): Option<T>` create an `Option<T>` from a possibly nullable value, where nullish become `None` and other values become `Some<T>`

### Example Usage

Let's say we have a sparse array of numbers. We'd like to sum it, but some members of the array might be nullish. We can't use falsy values as indication (because 0), so let's try to use options instead.

```ts
import { option } from "@oakfang/adt";

const numbers: Array<null | number> = [
  /*...*/
];
const sum = numbers
  // Array<null | number> -> Array<Option<number>>
  .map(fromNullable)
  // Array<Option<number>> -> number[]
  .map((o) => getOrElse(o, 0))
  // number[] -> number
  .reduce((x, y) => x + y, 0);
```

## `Result<Left, Right>` - the "computation that might fail" type

Some function might throw, but the issue with that is that neither JS nor TS provide us with a way to account for these thrown errors in a type-safe manner. The `Result` type aims to remove the need for thrown exception, as it encapsulates both a function that follows the "happy flow" (i.e., returns) and one that doesn't.