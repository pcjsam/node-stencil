import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { ModelAnnotations } from 'src/shared/utils/model-annotations';
import mongooseLeanGetters from 'mongoose-lean-getters';
import { uuidAutoConversionPlugin } from 'src/shared/mongo/uuid-auto-conversion.plugin';


export const COLLECTION_NAME = 'Board';
export const PRIMARY_KEY = '_id';

export namespace Board {

   
   // ===========================================
   // Projection: Board.Public
   // ===========================================
   @Schema()
   export class PublicDocument {
      
      @Prop({
         ...ModelAnnotations.uuid,
         required: true,
      })
      _id: string;
      
      @Prop({
         type: String,
         required: true,
      })
      jurisdiction_id: string;
      
      @Prop({
         type: String,
         required: true,
      })
      board_name: string;
      
      @Prop({
         type: String,
         required: false,
      })
      board_description: string;
      
   }

   export const PublicSchema = SchemaFactory.createForClass(PublicDocument);
   PublicSchema.plugin(mongooseLeanGetters);
   PublicSchema.plugin(uuidAutoConversionPlugin);
   
   
   // ===========================================
   // Entity: Board
   // ===========================================

   @Schema({ ...ModelAnnotations.document })
   export class BoardDocument {
      @Prop({
         type: String,
         required: false,
      })
      _id: string;
      
      @Prop({
         type: String,
         required: true,
      })
      jurisdiction_id: string;
      
      @Prop({
         ...ModelAnnotations.uuid,
         required: true,
      })
      account_id_creator: string;
      
      @Prop({
         type: String,
         required: true,
      })
      board_name: string;
      
      @Prop({
         type: String,
         required: false,
      })
      board_description: string;
      
      @Prop({
         type: Date,
         required: true,
      })
      created_utc: Date;
      
      @Prop({
         type: Date,
         required: true,
      })
      updated_utc: Date;
      
      @Prop({
         type: String,
         required: true,
      })
      searchable?: string;
      
   }
  
   export const BoardSchema = SchemaFactory.createForClass(BoardDocument);
   BoardSchema.plugin(uuidAutoConversionPlugin);
   BoardSchema.plugin(mongooseLeanGetters);

   

}