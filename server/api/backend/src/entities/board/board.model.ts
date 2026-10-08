import { sanitizeHtml, truncateStart } from 'src/shared/utils/string.utils';
// ===========================================
// Entity
// ===========================================

export class Board {
   static Projection = {
      _id: 1,
      jurisdiction_id: 1,
      account_id_creator: 1,
      board_name: 1,
      board_description: 1,
      created_utc: 1,
      updated_utc: 1,
      //searchable: 0, // here for visibility, we actively do not include `searchable`
   
   };

   _id!: string;
   jurisdiction_id!: string;
   account_id_creator!: string;
   board_name!: string;
   board_description?: string;
   /**
   * System Field
   */
   created_utc?: Date;
   /**
   * System Field
   */
   updated_utc?: Date;
   
   /**
   * System Field
   */
   searchable?: string;
   

   constructor(data: Partial<Board>) {
      
      Object.assign(this, data);
   }

   static sanitize(obj: Board): void {
      if (!obj) return;
      obj.jurisdiction_id = sanitizeHtml(obj.jurisdiction_id, false);
      obj.board_name = sanitizeHtml(obj.board_name, false);
      obj.board_description = sanitizeHtml(obj.board_description, false);
   }
   
   
   asConfigPerspective(): Board.ConfigPerspective {
      return new Board.ConfigPerspective(this);
   }
   
   toPublic(): Board.Public {
      return Board.Public.fromBoard(this);
   }
   

   /** Fills this with allowed fields from partial. Skips primary key, system fields (searchable, created_utc, updated_utc), and calculated fields. */
   fillFromPartial(partial: Partial<Board>): void {
      
      if (partial.jurisdiction_id !== undefined) {
         this.jurisdiction_id = partial.jurisdiction_id!;
      }
      
      if (partial.account_id_creator !== undefined) {
         this.account_id_creator = partial.account_id_creator!;
      }
      
      if (partial.board_name !== undefined) {
         this.board_name = partial.board_name!;
      }
      
      if (partial.board_description !== undefined) {
         this.board_description = partial.board_description!;
      }
      
   }
}


export namespace Board {
   
   // ===========================================
   // Custom Perspectives
   // ===========================================
   
   export class ConfigPerspective {
      constructor(private actual: Board) {}
      /**
      * Only use for routing fields (e.g. workspace_id). Do NOT read non-routing fields from
      * the returned object — that bypasses dependency tracking and change detection.
      */
      getActual(): Board {
         return this.actual;
      }

      get _id(): string {
         return this.actual._id;
      }

      
      set jurisdiction_id(value: string) { 
         this.actual.jurisdiction_id = value;
      }
      
      get jurisdiction_id() : string {
         return this.actual.jurisdiction_id;
      }
      
      set board_name(value: string) { 
         this.actual.board_name = value;
      }
      get board_name()  {
         return this.actual.board_name;
      }
      
      set board_description(value: string | undefined) { 
         this.actual.board_description = value;
      }
      get board_description() : string | undefined {
         return this.actual.board_description;
      }
      
   }
   
   // ===========================================
   // Projections
   // ===========================================
   
   export class Public
   {
      static Projection = {
         _id: 1,
         jurisdiction_id: 1,
         board_name: 1,
         board_description: 1,
         
      };

      static fromBoard(data: Board) : Public {
         const result = new Public();
         result._id = data._id;
         result.jurisdiction_id = data.jurisdiction_id;
         result.board_name = data.board_name;
         result.board_description = data.board_description;
         
         return result;
      }
      static copyToBoard(source: Board.Public, target: Board): void {
         //Disallow: target._id = source._id;
         //Disallow: target.jurisdiction_id = source.jurisdiction_id;
         target.board_name = source.board_name;
         target.board_description = source.board_description;
         
      }

      _id!: string;
      jurisdiction_id!: string;
      board_name!: string;
      board_description?: string;
      
   }
   
}