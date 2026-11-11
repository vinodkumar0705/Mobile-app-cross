// src/lib/async-context.ts
import { AsyncLocalStorage } from "async_hooks";
import { Request } from "express";

// We store the Express Request object so we always have access to its latest state
export const requestContext = new AsyncLocalStorage<Request>();
