import z from "zod";
import { PermissionAdaptor } from "./adaptors/permissions/permissionAdaptor";
import { ValidationAdapter } from "./adaptors/validations/validationAdaptor";
import { zodValidation } from "./adaptors/validations/zod";
import { FrameworkError, Result } from "./types";

type ActionConfig<
  Input,
  Output,
  ResultData,
  Actor,
  HandlerError = string,
> = {
  validation: ValidationAdapter<Input, Output>;
  getActor: (a: { params: Output }) => Promise<Actor | undefined>;
  permission: PermissionAdaptor<Actor, Output>;
  handler: (a: {
    params: Output;
    actor: Actor | undefined;
  }) => Promise<Result<ResultData, HandlerError>>;
};

export function createAction<
  Input,
  Output,
  ResultData = unknown,
  Actor = unknown,
  HandlerError = string,
>(config: ActionConfig<Input, Output, ResultData, Actor, HandlerError>) {
  const { validation, handler, getActor, permission } = config;

  return async (params: Input): Promise<Result<ResultData, FrameworkError | HandlerError>> => {
    // バリデーション実行
    const parsed = await validation.parse(params);

    if (!parsed.ok) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.message,
        },
      };
    }

    // アクター取得
    const actor = await getActor({ params: parsed.data });

    // パーミッションチェック
    if (permission) {
      const permissionResult = await permission({ actor, params: parsed.data });

      if (!permissionResult.permitted) {
        return {
          ok: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "Permission denied",
          },
        };
      }
    }

    // ハンドラー実行（ユーザー定義のエラー型をそのまま返す）
    return await handler({
      params: parsed.data,
      actor,
    });
  };
}

if (import.meta.main) {
  const test = createAction({
    validation: zodValidation(z.object({ a: z.coerce.number() })),
    getActor: async ({ params }) => {
      console.log("getting actor", params);
      return { userId: "test-user" };
    },
    permission: async ({ actor, params }) => {
      return { permitted: true };
    },
    handler: async ({ params, actor }) => {
      console.log("running handler", { params, actor });
      return {
        ok: true,
        data: params.a,
      };
    },
  });
  const res = await test({ a: "123" });
  console.log("result", res);
}
