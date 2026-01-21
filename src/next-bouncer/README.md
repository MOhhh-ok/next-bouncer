# next-bouncer

Type-safe validation library for Next.js Server Actions with adaptor pattern.

## Features

- 🎯 **Type-safe**: Full TypeScript support with automatic type inference
- 🔌 **Adaptor pattern**: Use any validation library (Zod, Yup, Joi, etc.)
- 🪶 **Lightweight**: Zero runtime dependencies (peer dependencies only)
- 🎨 **Flexible**: Create project-specific wrappers easily
- ✨ **Simple API**: Minimal boilerplate, maximum type safety

## Installation

```bash
bun add next-bouncer
# or
npm install next-bouncer
# or
pnpm add next-bouncer
```

**Peer dependencies:**
- `next` >= 14.0.0
- `react` >= 18.0.0
- `zod` >= 3.0.0 (if using Zod adaptor)

## Basic Usage

```typescript
"use server";

import { createAction, zodValidation } from "next-bouncer";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export const createUserAction = createAction({
  validation: zodValidation(schema),
  handler: async (input) => {
    // input is fully typed as { name: string, email: string }
    const user = await db.user.create({ data: input });
    
    return { ok: true, data: user };
  },
});
```

## Creating Project-Specific Wrappers

The recommended approach is to create a wrapper that fits your project's needs:

```typescript
// lib/create-action.ts
import { createAction as baseCreateAction, zodValidation } from "next-bouncer";
import { headers } from "next/headers";
import { z, type ZodType } from "zod";
import { getCurrentSession } from "@/lib/auth";

export function createAction<Schema extends ZodType, ResultData>(config: {
  schema: Schema;
  handler: (params: {
    input: z.infer<Schema>;
    session: Awaited<ReturnType<typeof getCurrentSession>>;
    headers: Headers;
  }) => Promise<{ ok: true; data: ResultData } | { ok: false; error: string }>;
}) {
  return baseCreateAction({
    validation: zodValidation(config.schema),
    handler: async (input) => {
      const session = await getCurrentSession();
      const headerData = await headers();
      
      return config.handler({
        input,
        session,
        headers: headerData,
      });
    },
  });
}
```

Then use your wrapper throughout your project:

```typescript
"use server";

import { createAction } from "@/lib/create-action";
import { z } from "zod";

const schema = z.object({
  title: z.string(),
  content: z.string(),
});

export const createPostAction = createAction({
  schema,
  handler: async ({ input, session, headers }) => {
    // All context is available and fully typed
    if (!session.user) {
      return { ok: false, error: "Unauthorized" };
    }
    
    const post = await db.post.create({
      data: {
        ...input,
        authorId: session.user.id,
      },
    });
    
    return { ok: true, data: post };
  },
});
```

## Custom Validation Adaptors

You can create adaptors for any validation library:

```typescript
import type { ValidationAdapter } from "next-bouncer";

// Example: Custom validator
export function customValidation<T>(
  validate: (input: unknown) => T | Promise<T>
): ValidationAdapter<unknown, T> {
  return {
    parse: async (input) => {
      try {
        const data = await validate(input);
        return { ok: true, data };
      } catch (error) {
        return {
          ok: false,
          error: {
            message: error instanceof Error ? error.message : "Validation failed",
          },
        };
      }
    },
  };
}
```

## API Reference

### `createAction(config)`

Creates a type-safe server action.

**Parameters:**
- `config.validation`: ValidationAdapter - The validation adaptor to use
- `config.handler`: Function - The handler function that receives validated input

**Returns:** A function that accepts `{ input }` and returns a `Result<T>`

### `zodValidation(schema)`

Zod validation adaptor.

**Parameters:**
- `schema`: ZodType - Zod schema to validate against

**Returns:** ValidationAdapter

### Types

```typescript
type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

type ValidationAdapter<Input, Output> = {
  parse: (input: Input) => Promise<
    | { ok: true; data: Output }
    | { ok: false; error: { message: string; [key: string]: any } }
  >;
};
```

## Philosophy

`next-bouncer` is designed with the following principles:

1. **Project-specific wrappers**: Instead of trying to cover every use case, we provide a simple foundation for you to build your own project-specific wrapper
2. **Type safety first**: Full TypeScript support with automatic type inference
3. **Minimal dependencies**: Only peer dependencies, no runtime dependencies
4. **Adaptor pattern**: Bring your own validation library
5. **Next.js focused**: Optimized specifically for Next.js Server Actions

## License

MIT

## Author

Masaaki Goshima ([@goshima](https://github.com/goshima))