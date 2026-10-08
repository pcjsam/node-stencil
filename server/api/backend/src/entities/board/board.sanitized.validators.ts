import { registerSanitizedValidators } from 'src/shared/utils/sanitized.registry';
import type { SanitizedValidatorMap } from 'src/shared/types/sanitized.types';
import { Board } from './board.model';
import {
   assertString,
   assertStringArray,
   assertBoolean,
   assertNumber,
   assertUuid,
   assertDate,
   assertEnum,
   assertEnumArray,
   assertPlainObject,
   assertNested,
   assertNestedArray,
   optional,
} from 'src/shared/utils/sanitized.validators';



const boardValidators: SanitizedValidatorMap = {
_id: (v) => optional(assertUuid)(v, '_id'),
jurisdiction_id: (v) => assertString(v, 'jurisdiction_id'),
account_id_creator: (v) => assertUuid(v, 'account_id_creator'),
board_name: (v) => assertString(v, 'board_name'),
board_description: (v) => optional(assertString)(v, 'board_description'),

};

registerSanitizedValidators(Board, boardValidators);


const boardpublicValidators: SanitizedValidatorMap = {
_id: (v) => optional(assertUuid)(v, '_id'),
jurisdiction_id: (v) => assertString(v, 'jurisdiction_id'),
board_name: (v) => assertString(v, 'board_name'),
board_description: (v) => optional(assertString)(v, 'board_description'),

};

registerSanitizedValidators(Board.Public, boardpublicValidators);