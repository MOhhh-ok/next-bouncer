import { Result } from "./types";

// コアの型定義 - 型推論をサポート
export interface ValidationAdapter<Output = any> {
  // パース関数（スキーマは内包される）
  parse: (
    input: unknown,
  ) => Promise<
    | { ok: true; data: Output }
    | { ok: false; error: { message: string; issues?: any[] } }
  >;
}

// スキーマから出力型を推論するヘルパー型
export type InferOutput<VAdapter> = VAdapter extends ValidationAdapter<
  infer Output
> ? Output
  : never;
