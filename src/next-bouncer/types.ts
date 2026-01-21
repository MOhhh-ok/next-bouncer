export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// フレームワーク側のエラー
export type FrameworkError =
  | { code: "VALIDATION_ERROR"; message: string }
  | { code: "PERMISSION_DENIED"; message: string };

// アクション全体の結果型（フレームワークエラー + ユーザー定義エラー）
export type ActionResult<T, HandlerError = string> = Result<T, FrameworkError | HandlerError>;
