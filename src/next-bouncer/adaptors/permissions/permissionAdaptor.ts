/**
 * Permission関数の戻り値
 */
export type PermissionResult =
  | { permitted: false }
  | { permitted: true };

/**
 * Permission Adaptor の型定義
 * Actorの型を受け取り、Permission関数を生成する
 */
export type PermissionAdaptor<Actor, Params> = (p: {
  actor: Actor | undefined;
  params: Params;
}) => PermissionResult | Promise<PermissionResult>;
