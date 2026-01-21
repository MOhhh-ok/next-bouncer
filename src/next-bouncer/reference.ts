// import { rateLimit } from "@repo/clients/redis";
// import { type Actor, type AppAbility, createAbility } from "@repo/db/permissions";
// import type { Locale } from "@repo/shared/config";
// import { auditLogger, outcomeError, outcomeErrors, type OutcomeResult, outcomeSuccess } from "@repo/shared/utils";
// import { getIpFromHeaders } from "@repo/shared/utils/server";
// import { type StringValue } from "ms";
// import { headers } from "next/headers";
// import * as R from "remeda";
// import { z, type ZodType } from "zod";
// import { getCurrentSession } from "../auth/sessions";
// import { getLocaleOnServer } from "./cookies";

// type SessionRes = Awaited<ReturnType<typeof getCurrentSession>>;

// type PermissionParams<Schema extends ZodType> = {
//   params: z.infer<Schema>;
//   actor: NonNullable<SessionRes>["user"] | undefined;
//   session: NonNullable<SessionRes>["session"] | undefined;
//   ability: AppAbility;
//   locale: Locale;
// };

// type PermissionResult<D = never> =
//   | { permitted: false }
//   | ([D] extends [never] ? { permitted: true } : { permitted: true; data: D });

// type HandlerParams<Schema extends ZodType, D = undefined> =
//   & PermissionParams<Schema>
//   & { data: D };

// export type PermissionFnc<Schema extends ZodType, PermissionData = void> = (
//   params: PermissionParams<Schema>,
// ) => PermissionResult<PermissionData> | Promise<PermissionResult<PermissionData>>;

// /**
//  * サーバーアクション生成
//  * permissionFncは、permissionFncsオブジェクトも活用できます。
//  * handler内は、予期されるエラーはoutcomeErrorを返してください。
//  * ログイン状態でhandler内でエラーが投げられるかoutcomeErrorが帰ってきた場合自動でログされます。
//  */
// export function createAction3<Schema extends ZodType, PermissionData = void, Result = unknown>(
//   config: {
//     schema?: Schema;
//     permissionFnc: PermissionFnc<Schema, PermissionData>;
//     audit?: {
//       message: string;
//       fields?: (keyof z.infer<Schema>)[];
//     };
//     rateLimit?: {
//       key: string;
//       limit: number;
//       window: StringValue; // "1m", "1h" など
//     };
//     handler: (params: HandlerParams<Schema, PermissionData>) => Promise<OutcomeResult<Result>>;
//   },
// ) {
//   const { schema = z.any(), permissionFnc, handler, audit, rateLimit: rateLimitConfig } = config;
//   return async (rawInput: z.input<Schema>) => {
//     const parsed = await schema.safeParseAsync(rawInput);
//     if (!parsed.success) {
//       return outcomeError(parsed.error.issues[0]?.message ?? "Invalid parameters");
//     }
//     const validatedInput = parsed.data;
//     const locale = await getLocaleOnServer();
//     const sessionRes = await getCurrentSession();
//     const headersRes = await headers();
//     const ip = getIpFromHeaders(headersRes);
//     const ability = createAbility(sessionRes?.user as Actor);
//     const userId = sessionRes?.user?.id;

//     // レート制限チェック
//     if (rateLimitConfig) {
//       const key = `action3:${rateLimitConfig.key}:${userId ?? ip}`;

//       const limited = await rateLimit({
//         key,
//         limit: rateLimitConfig.limit,
//         window: rateLimitConfig.window,
//       });

//       if (!limited.allowed) {
//         return outcomeError("Too many requests. Please try again later.");
//       }
//     }

//     const permissionParams = {
//       params: validatedInput,
//       actor: sessionRes?.user,
//       session: sessionRes?.session,
//       ability,
//       locale,
//     };

//     const permissionRes = await permissionFnc(permissionParams);
//     if (!permissionRes.permitted) {
//       return outcomeErrors.noPermission();
//     }

//     const success = () => {
//       if (userId && audit) {
//         auditLogger.info(
//           audit.message,
//           {
//             userId,
//             params: R.pick(validatedInput, audit.fields ?? []),
//           },
//           headersRes,
//         );
//       }
//     };

//     const failed = (error: unknown) => {
//       if (userId) {
//         auditLogger.error(
//           `${audit?.message ?? "An action"} - Failed`,
//           {
//             userId,
//             params: audit?.fields ? R.pick(validatedInput, audit.fields) : undefined,
//             error,
//           },
//           headersRes,
//         );
//       }
//     };

//     try {
//       const res = await handler(
//         "data" in permissionRes
//           ? { ...permissionParams, data: permissionRes.data }
//           : permissionParams as HandlerParams<Schema, PermissionData>,
//       );
//       if (res.ok) {
//         success();
//       } else {
//         failed(res.error);
//       }
//       return res;
//     } catch (error: unknown) {
//       failed(error);
//       return outcomeErrors.unknown();
//     }
//   };
// }

// // Actionの戻り値から ok: true の場合の data の型を抽出
// export type ExtractActionData3<T> = T extends (
//   ...args: any[]
// ) => Promise<infer R> ? R extends { ok: true; data: infer D } ? D
//   : never
//   : never;

// if (import.meta.main) {
//   const testAction = createAction3({
//     schema: z.object({ a: z.number() }),
//     permissionFnc: async ({ params: { a } }) => ({ permitted: true, data: { a: a + 1 } }),
//     handler: async ({ data }) => outcomeSuccess(data),
//     audit: {
//       message: "Test action executed",
//       fields: ["a"],
//     },
//   });
//   type TestActionData = ExtractActionData3<typeof testAction>;
// }
