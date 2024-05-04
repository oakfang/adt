import { createTagType } from "./tags";

const unhandledException = createTagType("UnhandledException");
export const raise = unhandledException<unknown>;
export type UnhandledException = ReturnType<typeof raise>;

export type getErrorTypeFromMapper<
  ErrorMapper extends ((error: unknown) => any) | undefined = undefined
> = ErrorMapper extends undefined
  ? UnhandledException
  : ErrorMapper extends (error: unknown) => infer E
  ? E
  : UnhandledException;
