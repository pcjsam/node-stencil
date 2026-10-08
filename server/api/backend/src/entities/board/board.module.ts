import { forwardRef, Module } from '@nestjs/common';
import { registerSchema } from 'src/shared/managers/schema-registry';
import { SchemaFactory } from '@nestjs/mongoose';
import { MongoModule } from 'src/shared/mongo/mongo.module';
import { BoardController } from './board.controller';
import { BoardManager } from './board.manager';
import { COLLECTION_NAME, Board } from './board.schema';
import { EntitiesModule } from 'src/entities/entity.module';

@Module({
   imports: [MongoModule, forwardRef(() => EntitiesModule)],
   controllers: [BoardController],
   providers: [
      BoardManager,
      {
         provide: 'BoardManager', // For dynamic resolution
         useClass: BoardManager,
      },
   ],
   exports: [
      BoardManager,
      {
         provide: 'BoardManager', // For dynamic resolution
         useClass: BoardManager,
      },
   ]
})
export class BoardModule {
   constructor() {
      registerSchema({
         name: COLLECTION_NAME,
         schema: Board.BoardSchema,
      });
   }
}