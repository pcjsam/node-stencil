import { ConflictException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { MongoManagerIsolated } from 'src/shared/managers/mongo-manager.isolated';
import { MongoConnectionProvider } from 'src/shared/mongo/mongo-connection.provider';
import { Board } from './board.model';
import { QueryFilter, ProjectionFields, SortOrder, UpdateQuery } from 'mongoose';
import type { Document } from 'bson';
import { COLLECTION_NAME, PRIMARY_KEY } from './board.schema';
import { v4 as uuidv4 } from 'uuid';
import { isNullOrWhiteSpace, sanitizeHtml, truncateStart } from 'src/shared/utils/string.utils';
import { SEARCHABLE_DIVIDER } from 'src/shared/mongo';
import { UIException } from 'src/shared/exceptions/friendly-exception';
import { LocalizableString } from 'src/shared/types/i18n/localizable-string';
import { DependencyCoordinator } from '../dependencies/dependency-coordinator';
import { EntityRegistry } from '../entity.registry';
import { DocumentOperation } from '../common/document-operation';
import { ItemResult } from 'src/shared/types/data/item-result';
import { ListResult } from 'src/shared/types/data/list-result';
import { SortInfo } from 'src/shared/types/data/sort-info';
import { MAX_INT_32 } from 'src/shared/constants/int';
import { validate as uuidValidate } from 'uuid';
import { MemoryCache } from 'src/shared/cache/memory-cache';
import { BatchUtils } from 'src/shared/utils';
import { IAccountDeletionManager } from '../account-deletion-manager';


@Injectable()
export class BoardManagerBase extends MongoManagerIsolated<Board> implements IAccountDeletionManager {
   protected readonly logger = new Logger(BoardManagerBase.name);

   constructor(connectionProvider: MongoConnectionProvider, entities: EntityRegistry, dependencyCoordinator: DependencyCoordinator, memoryCache: MemoryCache) {
      super(COLLECTION_NAME, PRIMARY_KEY, connectionProvider, entities, dependencyCoordinator, memoryCache);
   }
   async deleteAllForAccount(jurisdiction_id: string, account_id: string): Promise<number> {
      const filter: QueryFilter<Board> = { account_id_creator: account_id };
      return await this._deleteManyIsolated(jurisdiction_id, filter);
   }


   async validateExistence(jurisdiction_id:string, _id:string) {
      const found = await this._retrieveIsolated<Board>(Board, jurisdiction_id, _id, { _id: 1 });
      
      if (!found) {
         throw new UIException(LocalizableString.General_InvalidReference("Board"));
      }
   }
   
   
   async anyWithJurisdiction(jurisdiction_id:string | undefined): Promise<boolean>{
      if (!jurisdiction_id){
         return false;
      }
      const filter: QueryFilter<Board> = {
         jurisdiction_id: jurisdiction_id
      };

      const found = await this._findIsolated<Board>(Board, jurisdiction_id, filter, { _id: 1 }, 0, 1, undefined, false);
      return found.items.length > 0;
   }
   

   async getById(jurisdiction_id: string, _id: string): Promise<Board | undefined> {
      const result = this._retrieveIsolated<Board>(Board, jurisdiction_id, _id, Board.Projection);
      return result;
   }
   
   async getByIdPublic(jurisdiction_id: string, _id:string) : Promise<Board.Public | undefined> {
      const result = await this._retrieveIsolated<Board.Public>(Board.Public, jurisdiction_id, _id, Board.Public.Projection);
      return result;
   }
   

   async getWithin<TProjection>(
      ctor: new (...args: any[]) => TProjection, 
      projection: ProjectionFields<TProjection>,
      jurisdiction_id: string,
      ids: string[]
   ): Promise<TProjection[]> {
      if (!ids || ids.length === 0) {
         return [];
      }

      const result = BatchUtils.getWithinBuffered(ids, async (ids: string[]): Promise<TProjection[]> => {
         const orFilter = BatchUtils.createOrFilter<Board>(ids, '_id');
         const filter: QueryFilter<Board> = {
            jurisdiction_id: jurisdiction_id,
            ...orFilter,
         };

         const result = await this._findIsolated<TProjection>(ctor, jurisdiction_id, filter, projection, 0, MAX_INT_32);
         
         return result.items;
      });
      return result;
      
   }

   

   async find(
      jurisdiction_id: string, 
      skip: number, 
      take: number,
      keyword?: string,
      order_by?: string, 
      descending: boolean = false
   ): Promise<ListResult<Board>> {
      return await this.findAs<Board>(
         Board,
         Board.Projection,
         jurisdiction_id, 
         skip, 
         take,
         keyword,
         order_by, 
         descending
      );
   }
   

   protected async findAs<TProjection>(
      ctor: new (...args: any[]) => TProjection, 
      projection: ProjectionFields<TProjection>,
      jurisdiction_id: string, 
      skip: number, 
      take: number,
      keyword?: string,
      order_by?: string, 
      descending: boolean = false
   ): Promise<ListResult<TProjection>> {
      const filter: QueryFilter<Board> = {
         jurisdiction_id: jurisdiction_id,
      };
      
      if (!isNullOrWhiteSpace(keyword)) {
         // Escape special regex characters to treat them as literals
         const escapedKeyword = keyword!.toLowerCase().replace(/[+*?^${}()|[\]\\]/g, '\\$&');
         filter.searchable = { $regex: escapedKeyword, $options: 'i' };
      }
      
      const sorts = this.applySafeSort([{ field: order_by, descending}]);

      let result = await this._findIsolated<TProjection>(ctor, jurisdiction_id, filter, projection, skip, take, sorts);
      
      result = await this.postProcessFindAs(result);

      return result;
   }

   
   async insert(jurisdiction_id: string, document: Board): Promise<Board> {
      if (jurisdiction_id != document.jurisdiction_id) {
         throw new ConflictException("jurisdiction_id mismatch");
      }
      
      if (!document._id) {
         document._id = uuidv4();
      }
      
      document.created_utc = new Date();
      document.updated_utc = document.created_utc;

      await this.preProcessMutationDocument(document, DocumentOperation.insert);
      await this.preProcessMutationConfigPerspective(document.asConfigPerspective(), DocumentOperation.insert);
      
      await this.calculateSearchable(document);
      
      await this.sanitize(document);
      
      await this.validate(document);
      
      await this.entities.jurisdictionManager.validateExistence(document.jurisdiction_id);
      await this._insertIsolated(Board, jurisdiction_id, document);
      
      await this.postProcessMutationDocument(document, DocumentOperation.insert);
      await this.postProcessMutationConfigPerspective(document.asConfigPerspective(), DocumentOperation.insert);
      

      return document;
   }

   async replace(jurisdiction_id: string, _id: string, document: Board): Promise<Board> {
      if (jurisdiction_id != document.jurisdiction_id) {
         throw new ConflictException("jurisdiction_id mismatch");
      }
      
      document.updated_utc = new Date();

      await this.preProcessMutationDocument(document, DocumentOperation.replace);
      await this.preProcessMutationConfigPerspective(document.asConfigPerspective(), DocumentOperation.replace);
      
      await this.calculateSearchable(document);
      
      await this.sanitize(document);
      
      await this.validate(document);
      
      await this.entities.jurisdictionManager.validateExistence(document.jurisdiction_id);
      
      const unset: string[] | undefined = undefined; // No nullable nested objects to remove

      await this._upsertIsolated(Board, jurisdiction_id, _id, document, unset);
      
      await this.postProcessMutationDocument(document, DocumentOperation.replace);
      await this.postProcessMutationConfigPerspective(document.asConfigPerspective(), DocumentOperation.replace);
      

      return document;

   }

   

   async delete(document: Board): Promise<boolean> {
      await this.preProcessMutationDocument(document, DocumentOperation.delete);
      
      // Get Server version
      const actual = await this.getById(document.jurisdiction_id, document._id);
      if (actual == undefined) {
         return true;
      }
      
      const result = await this._deleteIsolated(actual.jurisdiction_id, actual._id);
      if (result) {
         await this.postProcessMutationDocument(actual, DocumentOperation.delete);
      }
      
      return result;
   }
   
   async updateConfigPerspective(perspective: Board.ConfigPerspective){
      const actual = perspective.getActual();

      await this.preProcessMutationConfigPerspective(perspective, DocumentOperation.updatePerspective);
      
      await this.sanitizeConfigPerspective(perspective);
      
      await this.validateConfigPerspective(perspective);
      
      await this.calculateSearchable(actual);
      const filter = { _id: perspective._id };
      const update: UpdateQuery<Board>  = {
         $set: {
            updated_utc: new Date(),
            searchable: actual.searchable,
            board_name: perspective.board_name,
            board_description: perspective.board_description
         }
      };
      const removableFields = this.determineRemovableFieldsConfigPerspective(perspective);
      if (removableFields) {
         update.$unset = removableFields;
      }

      const result = await this._updatePartialIsolated(perspective.jurisdiction_id, filter, update);
      
      if (result.matchedCount > 0) {
         await this.postProcessMutationConfigPerspective(perspective, DocumentOperation.updatePerspective);
      }
      
      return result.matchedCount > 0;
   }

   protected determineRemovableFieldsConfigPerspective(perspective: Board.ConfigPerspective): Record<string, 1> | undefined {
      if (!perspective){
         return; // sanity
      }

      // Check all nullable perspective fields for unset (handles both primitives and classes)
      const fieldsToRemove:string[] = [];
      
      if (perspective.board_description === undefined) {
         fieldsToRemove.push("board_description");
      }
      
      if (fieldsToRemove.length > 0) {
         const unset = {} as Record<string, 1>;
         fieldsToRemove.forEach(field => {
            unset[field] = 1;
         });
         return unset;
      }

      return undefined;
   }
   

   async ensureIndexes(jurisdiction_id: string): Promise<void> {
      const connection = await this.getIsolatedConnection(jurisdiction_id);
      const existing = await connection.db!.listCollections({ name: this.collectionName }).toArray();
      if (existing.length == 0){
         return; // doesn't exist yet
      }
      
      const model = await this.getIsolatedModel(jurisdiction_id);
      const collection = model.db.collection(this.collectionName);
      const indexes = await collection.indexes();

      let match:Document | undefined = undefined;
      
      // default_pkey_routed_v1
      match = indexes.find(x => x.name == 'default_pkey_routed_v1');
      if (!match)
      {
         const options = {
            unique: false,
            name: 'default_pkey_routed_v1'
         };
         const fields = {
            jurisdiction_id: 1,
            _id: 1
         };

         await collection.createIndex(fields, options);
      }
      
      // default_searchable
      match = indexes.find(x => x.name == "default_searchable_en_v1");
      if (match == null)
      {
         const options = {
            unique: false,
            name: 'default_searchable_en_v1',
            collation: {
               locale: 'en',
               strength: 1    // Case-insensitive, diacritic-insensitive
            }
         };
         const fields = {
            jurisdiction_id: 1,
            searchable: 1,
         };
         await collection.createIndex(fields, options);
      }
      
   }

   protected determineRemovableFieldsDocument(document: Board): string[] | undefined {
      if (!document){
         return; // sanity
      }
      const fieldsToRemove:string[] = [];
      
      // Check all nullable fields for unset (handles both primitives and classes)
      if (document.board_description === undefined) {
         fieldsToRemove.push('board_description');
      }
      
      return fieldsToRemove;
   }

   /**
    * Only allow sorting by known indexed fields
    */
   protected applySafeSort(sorts:SortInfo[]) : [string, SortOrder][] {
      const result: [string, SortOrder][] = [];

      const allowedFields = ['board_name'];
      
      for (const item of sorts) {
         if (!isNullOrWhiteSpace(item.field)) {
            if (allowedFields.includes(item.field!)) {
               result.push([item.field!, item.descending === true ? 'desc' : 'asc']);
            }
         }
      }
      if (result.length === 0) {
         result.push(['_id', 'asc']);
      }

      return result;
   }

   protected async sanitize(document: Board) : Promise<void> {
      Board.sanitize(document);
   }
   
   protected async sanitizeConfigPerspective(perspective:Board.ConfigPerspective) {
      
      perspective.board_name = sanitizeHtml(perspective.board_name, false);
      perspective.board_description = sanitizeHtml(perspective.board_description, false);
   }
   

   protected async validate(document: Board): Promise<void> {
      // Fields
      
      if (!document._id || !uuidValidate(document._id)) {
         throw new UIException(LocalizableString.General_FieldRequired("board._id"));
      }
      
      if (isNullOrWhiteSpace(document.jurisdiction_id)) {
         throw new UIException(LocalizableString.General_FieldRequired("board.jurisdiction_id"));
      }
      
      if (!document.account_id_creator || !uuidValidate(document.account_id_creator)) {
         throw new UIException(LocalizableString.General_FieldRequired("board.account_id_creator"));
      }
      
      if (isNullOrWhiteSpace(document.board_name)) {
         throw new UIException(LocalizableString.General_FieldRequired("board.board_name"));
      }
      
      if (document.jurisdiction_id && document.jurisdiction_id.length > 10) {
         throw new UIException(LocalizableString.General_FieldMaxLength(10, "board.jurisdiction_id"));
      }
      
      if (document.board_name && document.board_name.length > 200) {
         throw new UIException(LocalizableString.General_FieldMaxLength(200, "board.board_name"));
      }
      
      if (document.board_description && document.board_description.length > 500) {
         throw new UIException(LocalizableString.General_FieldMaxLength(500, "board.board_description"));
      }
      
   }

   
   protected async validateConfigPerspective(document: Board.ConfigPerspective): Promise<void> {
      
      if (isNullOrWhiteSpace(document.board_name)) {
         throw new UIException(LocalizableString.General_FieldRequired("board.board_name"));
      }
      
      if (document.board_name && document.board_name.length > 200) {
         throw new UIException(LocalizableString.General_FieldMaxLength(200, "board.board_name"));
      }
      
      if (document.board_description && document.board_description.length > 500) {
         throw new UIException(LocalizableString.General_FieldMaxLength(500, "board.board_description"));
      }
      
   }
   
   protected async calculateSearchable(document: Board) : Promise<void> {
      document.searchable = SEARCHABLE_DIVIDER;
      
      if (!isNullOrWhiteSpace(document.board_name)) {
         document.searchable += document.board_name!.toLowerCase() + SEARCHABLE_DIVIDER;
      }
   }
   

   protected async postProcessFindAs<TProjection>(data: ListResult<TProjection>) : Promise<ListResult<TProjection>> {
      return data;
   }
   protected async preProcessMutationDocument(document: Board, documentOperation: DocumentOperation): Promise<void> {
      // for override customization
   }
   protected async postProcessMutationDocument(document: Board, documentOperation: DocumentOperation): Promise<void> {
      // for override customization
   }
   
   protected async preProcessMutationConfigPerspective(perspective: Board.ConfigPerspective, documentOperation: DocumentOperation): Promise<void> {
      // for override customization
   }
   protected async postProcessMutationConfigPerspective(perspective: Board.ConfigPerspective, documentOperation: DocumentOperation): Promise<void> {
      // for override customization
   }
   
}