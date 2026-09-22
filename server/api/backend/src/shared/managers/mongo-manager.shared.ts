import { Injectable } from '@nestjs/common';
import { Model, QueryFilter, ProjectionFields, UpdateWriteOpResult, UpdateQuery, SortOrder, Connection, AnyBulkWriteOperation } from 'mongoose';
import { MongoManagerBase } from './mongo-manager.base';
import { MongoConnectionProvider } from '../mongo/mongo-connection.provider';
import { ListResult } from '../types/data/list-result';
import { EntityRegistry } from 'src/entities/entity.registry';
import { DependencyCoordinator } from 'src/entities/dependencies/dependency-coordinator';
import { SHARED_TENANT_CODE } from '../constants/tenants';
import { MemoryCache } from '../cache/memory-cache';
import { IMongoManagerIndexable } from './mongo-manager-indexable';
import { hasEncryptedFields } from './schema-registry';

@Injectable()
export abstract class MongoManagerShared<T> extends MongoManagerBase<T> implements IMongoManagerIndexable {
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

   abstract ensureIndexes(): Promise<void>;

   /** This should not be used directly by custom code, it is designed for aspect flexibility.  Code should use an _ underscore method here. */
   protected async getSharedConnection(): Promise<Connection> {
      return this.getConnection(SHARED_TENANT_CODE);
   }

   /** This should not be used directly by custom code, it is designed for aspect flexibility.  Code should use an _ underscore method here. */
   protected async getSharedModel(): Promise<Model<T>> {
      return this.getModel(SHARED_TENANT_CODE);
   }

   protected async _retrieveShared<R = T>(ctor: new (...args: any[]) => R, id: string, projection: ProjectionFields<T>): Promise<R | undefined> {
      const model = await this.getSharedModel();
      const doc = await model
         .findOne({ [this.primaryKeyField]: id } as QueryFilter<T>)
         .select(projection)
         .lean({ getters: true })
         .exec();

      if (!doc) return undefined;

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc as R;
   }

   protected async _findShared<R = T>(
      ctor: new (...args: any[]) => R,
      filter: QueryFilter<T>,
      projection: ProjectionFields<T>,
      skip: number,
      take: number,
      sort?: { [key: string]: SortOrder } | [string, SortOrder][],
      includeTotal?: boolean
   ): Promise<ListResult<R>> {
      const model = await this.getSharedModel();
      const filtered = model.find(filter);
      const docs = await this.fetchAsSteppedList(filtered, projection, skip, take, sort, includeTotal === undefined ? true : includeTotal);

      docs.items = docs.items.map(doc => {
         Object.setPrototypeOf(doc, ctor.prototype);
         return doc;
      }) as any;

      return docs as unknown as ListResult<R>;
   }

   protected async _findOneShared<R = T>(
      ctor: new (...args: any[]) => R,
      filter: QueryFilter<T>,
      projection: ProjectionFields<T>
   ): Promise<R | undefined> {
      const model = await this.getSharedModel();
      const doc = await model.findOne(filter).select(projection).lean({ getters: true }).exec();

      if (!doc) return undefined;

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc as R;
   }

   protected async _insertShared(ctor: new (...args: any[]) => T, doc: T): Promise<T> {
      const model = await this.getSharedModel();
      await model.create(doc);

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc;
   }

   protected async _insertManyShared(docs: T[], chunkSize: number = 500): Promise<number> {
      if (docs.length === 0) {
         return 0;
      }
      const model = await this.getSharedModel();
      const size = Math.max(1, chunkSize);
      for (let i = 0; i < docs.length; i += size) {
         await model.insertMany(docs.slice(i, i + size), { ordered: false });
      }
      return docs.length;
   }

   protected async _upsertShared(ctor: new (...args: any[]) => T, id: string, doc: T, unsetFields?: string[]): Promise<T> {
      const model = await this.getSharedModel();
      const filter = { [this.primaryKeyField]: id } as QueryFilter<T>;

      const updateQuery: UpdateQuery<T> = { $set: doc } as UpdateQuery<T>;
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

   protected async _updatePartialShared(filter: QueryFilter<T>, update: UpdateQuery<T>): Promise<UpdateWriteOpResult> {
      const model = await this.getSharedModel();
      const result = await model.updateOne(filter, update).exec();
      return result;
   }
   protected async _updatePartialRetrieveShared<R = T>(
      ctor: new (...args: any[]) => R,
      filter: QueryFilter<T>,
      update: UpdateQuery<T>,
      projection: ProjectionFields<T>
   ): Promise<R | undefined> {
      const model = await this.getSharedModel();
      const doc = await model.findOneAndUpdate(filter, update, { returnDocument: 'after' }).select(projection).lean({ getters: true }).exec();

      if (!doc) return undefined;

      Object.setPrototypeOf(doc, ctor.prototype);
      return doc as R;
   }

   protected async _updateManyPartialShared(filter: QueryFilter<T>, update: UpdateQuery<T>): Promise<UpdateWriteOpResult> {
      const model = await this.getSharedModel();
      const result = await model.updateMany(filter, update).exec();
      return result;
   }

   protected async _bulkWriteShared(ops: AnyBulkWriteOperation[], chunkSize: number = 500): Promise<number> {
      if (ops.length === 0) {
         return 0;
      }
      const model = await this.getSharedModel();
      const size = Math.max(1, chunkSize);
      for (let i = 0; i < ops.length; i += size) {
         await model.bulkWrite(ops.slice(i, i + size), { ordered: false });
      }
      return ops.length;
   }

   protected async _deleteShared(id: string): Promise<boolean> {
      const model = await this.getSharedModel();
      const filter = { [this.primaryKeyField]: id } as QueryFilter<T>;

      const result = await model.findOneAndDelete(filter).exec();
      return !!result;
   }

   /**
    * Multi-document delete for account-erasure / DSAR paths. Queryable Encryption
    * collections cannot use deleteMany; those go through per-_id deleteOne bulkWrite.
    */
   protected async _deleteManyShared(filter: QueryFilter<T>): Promise<number> {
      const model = await this.getSharedModel();
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
}
