import _ from 'lodash';
import { PartialDeep } from 'type-fest';

export interface IBoardOption {
  _id: string;
  board_name: string;
}

export interface IBoard extends IBoardOption  {
  jurisdiction_id: string;
  account_id_creator: string;
  board_description?: string;
  updated_utc?: Date,
  created_utc?: Date
}

export interface IBoard_Public {
   _id: string;
   jurisdiction_id: string;
   board_name: string;
   board_description?: string;
   
   updated_utc?: Date
}


function Board(updates?: PartialDeep<IBoard>, original?: PartialDeep<IBoard>): IBoard {
	updates = updates || {};
	original = original || {};

	return _.defaults(updates, original, {
    _id: undefined!,
    jurisdiction_id: '',
    account_id_creator: undefined!,
    board_name: '',
    board_description: undefined!,
    
    created_utc: undefined,
    updated_utc: undefined
	});
}

export default Board;