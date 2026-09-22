import { Injectable } from '@nestjs/common';
import { Model, QueryFilter, ProjectionFields, UpdateWriteOpResult, UpdateQuery, SortOrder, QueryWithHelpers, Query, Connection, AnyBulkWriteOperation } from 'mongoose';
import { MongoManagerBase } from './mongo-manager.base';
import { MongoConnectionProvider } from '../mongo/mongo-connection.provider';
import { ListResult } from '../types/data/list-result';
import { EntityRegistry } from 'src/entities/entity.registry';
import { DependencyCoordinator } from 'src/entities/dependencies/dependency-coordinator';
import { MemoryCache } from '../cache/memory-cache';
import { IMongoManagerIndexable, IMongoManagerIndexableIsolated } from './mongo-manager-indexable';
import { hasEncryptedFields } from './schema-registry';

@Injectable()
export abstract class MongoManagerIsolated<T> extends MongoManagerBase<T> implements IMongoManagerIndexableIsolated {
   constructor(
      collectionName: string,
      primaryKeyField: keyof T,
      connectionProvider: MongoConnectionProvider,
      entities: EntityRegistry,
      dependencyCoordinator: DependencyCoordinator,
      protected memoryCache: MemoryCache
   ) {
      super(collectionName, primaryKeyField, connectionProvider, entities, dependencyCoordinator);
   }

   abstract ensureIndexes(route: string): Promise<void>;

   /** This should not be used directly by custom code, it is designed for aspect flexibility.  Code should use an _ underscore method here. */
   protected async getIsolatedConnection(tenant_code: string): Promise<Connection> {
      if (!tenant_code) {
         throw new Error('tenant_code required, but not provided');
      }
      return this.getConnection(tenant_code);
   }
   /** This should not be used directly by custom code, it is designed for aspect flexibility.  Code should use an _ underscore method here. */
   protected async getIsolatedModel(tenant_code: string): Promise<Model<T>> {
      if (!tenant_code) {
         throw new Error('tenant_code required, but not provided');
      }
      return await this.getModel(tenant_code);
   }

   protected async _retrieveIsolated<R = T>(
      ctor: new (...args: any[]) => R,
      tenant_code: string,
      id: string,
      projection: ProjectionFields<T>
   ): Promise<R | undefined> {
      const model = await this.getIsolatedModel(tenant_code);

      const doc = await model
         .findOne({ [this.primaryKeyField]: id } as QueryFilter<T>)
         .select(projection)
         .lean({ getters: true })
         .exec();
      if (!doc) return undefined;

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc as R;
   }

   protected async _findTenant<R = T>(
      ctor: new (...args: any[]) => R,
      tenant_code: string,
      filter: QueryFilter<T>,
      projection: ProjectionFields<T>,
      skip: number,
      take: number,
      sort?: { [key: string]: SortOrder } | [string, SortOrder][],
      includeTotal?: boolean
   ): Promise<ListResult<R>> {
      const model = await this.getModel(tenant_code);
      const filtered = model.find(filter);
      const docs = await this.fetchAsSteppedList(filtered, projection, skip, take, sort, includeTotal === undefined ? false : includeTotal);

      // zero-copy prototype
      docs.items = docs.items.map(doc => {
         Object.setPrototypeOf(doc, ctor.prototype);
         return doc;
      }) as any;

      return docs as unknown as ListResult<R>;
   }

   protected async _findIsolated<R = T>(
      ctor: new (...args: any[]) => R,
      tenant_code: string,
      filter: QueryFilter<T>,
      projection: ProjectionFields<T>,
      skip: number,
      take: number,
      sort?: { [key: string]: SortOrder } | [string, SortOrder][],
      includeTotal?: boolean
   ): Promise<ListResult<R>> {
      const model = await this.getIsolatedModel(tenant_code);
      const filtered = model.find(filter);
      const docs = await this.fetchAsSteppedList(filtered, projection, skip, take, sort, includeTotal === undefined ? true : includeTotal);

      // zero-copy prototype
      docs.items = docs.items.map(doc => {
         Object.setPrototypeOf(doc, ctor.prototype);
         return doc;
      }) as any;

      return docs as unknown as ListResult<R>;
   }
   protected async _findOneIsolated<R = T>(
      ctor: new (...args: any[]) => R,
      tenant_code: string,
      filter: QueryFilter<T>,
      projection: ProjectionFields<T>
   ): Promise<R | undefined> {
      const model = (await this.getIsolatedModel(tenant_code)) as Model<T>;
      const doc = await model.findOne(filter).select(projection).lean({ getters: true }).exec();

      if (!doc) return undefined;

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc as R;
   }

   protected async _insertIsolated(ctor: new (...args: any[]) => T, tenant_code: string, doc: T): Promise<T> {
      const model = await this.getIsolatedModel(tenant_code);

      await model.create(doc);

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc;
   }

   /** Unordered `insertMany`. Empty `docs` is a no-op. Chunked so a large fold cannot exceed BSON limits. */
   protected async _insertManyIsolated(tenant_code: string, docs: T[], chunkSize: number = 500): Promise<number> {
      if (docs.length === 0) {
         return 0;
      }
      const model = await this.getIsolatedModel(tenant_code);
      const size = Math.max(1, chunkSize);
      for (let i = 0; i < docs.length; i += size) {
         await model.insertMany(docs.slice(i, i + size), { ordered: false });
      }
      return docs.length;
   }

   protected async _upsertIsolated(ctor: new (...args: any[]) => T, tenant_code: string, id: string, doc: T, unsetFields?: string[]): Promise<T> {
      const model = await this.getIsolatedModel(tenant_code);
      const filter = { [this.primaryKeyField]: id } as QueryFilter<T>;

      // Shallow copy: mongoose casts $set values in place (e.g. UUID strings ->
      // BSON Binary), which would silently corrupt the caller's document.
      const updateQuery: UpdateQuery<T> = { $set: { ...doc } } as UpdateQuery<T>;
      if (unsetFields && unsetFields.length > 0) {
         const unset = {} as Record<string, 1>;
         unsetFields.forEach(field => {
            unset[field] = 1;
         });
         updateQuery.$unset = unset;
      }

      await model.findOneAndUpdate(filter, updateQuery, { upsert: true }).exec();

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc;
   }

   protected async _deleteIsolated(tenant_code: string, id: string): Promise<boolean> {
      const model = await this.getIsolatedModel(tenant_code);
      const filter = { [this.primaryKeyField]: id } as QueryFilter<T>;

      const result = await model.findOneAndDelete(filter).exec();
      return !!result;
   }

   /**
    * Multi-document delete for account-erasure / DSAR paths. Queryable Encryption
    * collections cannot use deleteMany; those go through per-_id deleteOne bulkWrite.
    */
   protected async _deleteManyIsolated(jurisdiction_id: string, filter: QueryFilter<T>): Promise<number> {
      const model = await this.getIsolatedModel(jurisdiction_id);
      if (hasEncryptedFields(this.collectionName)) {
         const matches = await model.find(filter, { _id: 1 } as ProjectionFields<T>).lean({ getters: true }).exec();
         if (matches.length === 0) {
            return 0;
         }
         const bulkResult = await model.bulkWrite(
            matches.map(m => ({
               deleteOne: {
                  filter: { _id: (m as { _id: string })._id },
               },
            })) as AnyBulkWriteOperation[],
            { ordered: false },
         );
         return bulkResult.deletedCount ?? matches.length;
      }
      const result = await model.deleteMany(filter).exec();
      return result.deletedCount ?? 0;
   }

   protected async _updatePartialIsolated(jurisdiction_id: string, filter: QueryFilter<T>, update: UpdateQuery<T>): Promise<UpdateWriteOpResult> {
      const model = await this.getIsolatedModel(jurisdiction_id);
      const result = await model.updateOne(filter, update).exec();
      return result;
   }

   protected async _updatePartialRetrieveIsolated<R = T>(
      ctor: new (...args: any[]) => R,
      jurisdiction_id: string,
      filter: QueryFilter<T>,
      update: UpdateQuery<T>,
      projection: ProjectionFields<T>
   ): Promise<R | undefined> {
      const model = await this.getIsolatedModel(jurisdiction_id);
      const doc = await model.findOneAndUpdate(filter, update, { returnDocument: 'after' }).select(projection).lean({ getters: true }).exec();

      if (!doc) return undefined;

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc as R;
   }

   protected async _updateManyPartialIsolated(jurisdiction_id: string, filter: QueryFilter<T>, update: UpdateQuery<T>): Promise<UpdateWriteOpResult> {
      const model = await this.getIsolatedModel(jurisdiction_id);
      const result = await model.updateMany(filter, update).exec();
      return result;
   }

   /**
    * Unordered `bulkWrite` — Mongo's per-document bulk (mixed insert/update/delete).
    * Use this when each op has its own filter/`$set`. `_updateManyPartialIsolated` is
    * the same `$set` applied to every match.
    */
   protected async _bulkWriteIsolated(
      tenant_code: string,
      ops: AnyBulkWriteOperation[],
      chunkSize: number = 500
   ): Promise<number> {
      if (ops.length === 0) {
         return 0;
      }
      const model = await this.getIsolatedModel(tenant_code);
      const size = Math.max(1, chunkSize);
      for (let i = 0; i < ops.length; i += size) {
         await model.bulkWrite(ops.slice(i, i + size), { ordered: false });
      }
      return ops.length;
   }
}
