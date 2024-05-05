import { createTagType } from "./tags";

const unhandledException = createTagType("UnhandledException");
const _raise = unhandledException;
export const raise = (value: unknown) => _raise(value);
export type UnhandledException = ReturnType<typeof _raise<unknown>>;

export type getErrorTypeFromMapper<
  ErrorMapper extends ((error: unknown) => any) | undefined = undefined
> = ErrorMapper extends undefined
  ? UnhandledException
  : ErrorMapper extends (error: unknown) => infer E
  ? E
  : UnhandledException;
