import { Board } from './board.model';
import { BoardManager } from './board.manager';
import { BoardControllerBase } from './board.controller.base';

//NOTE: Codegen will create, but not alter this file.

export class BoardController extends BoardControllerBase  {
   constructor(manager: BoardManager) {
      super(manager);
   }
   // Custom Endpoints here
}