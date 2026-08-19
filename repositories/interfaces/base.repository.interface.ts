/**
 * Generic contract implemented by every repository.
 *
 * `TEntity`   — the shape returned to callers
 * `TCreate`   — payload accepted by `create`
 * `TUpdate`   — payload accepted by `update`
 * `TId`       — primary key type (UUID string for every model in this project)
 */
export interface IBaseRepository<TEntity, TCreate, TUpdate, TId = string> {
  findById(id: TId): Promise<TEntity | null>;
  findMany(params?: { take?: number; cursor?: TId }): Promise<TEntity[]>;
  create(data: TCreate): Promise<TEntity>;
  update(id: TId, data: TUpdate): Promise<TEntity>;
  /** Soft delete — sets `deletedAt`. Does not remove the row. */
  softDelete(id: TId): Promise<TEntity>;
  /** Permanently removes the row. Should be used sparingly (see DATABASE.md — never permanently delete messages by default). */
  hardDelete(id: TId): Promise<void>;
}
