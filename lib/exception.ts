import { createTagType } from "./tags";

const unhandledException = createTagType("UnhandledException");
export const raise = unhandledException<unknown>;
export type UnhandledException = ReturnType<typeof raise>;
