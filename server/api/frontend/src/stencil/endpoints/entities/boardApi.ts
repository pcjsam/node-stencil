import apiService from '@/stencil/apiService';
import { IBoard} from '@/stencil/models/entities/board';
import { ItemResult, ItemResultMeta } from '@/stencil/models/item-result';
import { ActionResult } from '@/stencil/models/action-result';
import { ListInput } from '@/stencil/models/list-input';
import { ListInputBoard } from '@/stencil/models/entities/requests/list-input-board';
import { ListResult, ListResultMeta } from '@/stencil/models/list-result';
import { RoutedInput, RoutedNoInput } from '@/stencil/models/routed-input';
import { IBoard_Public } from '@/stencil/models/entities/board';

export const addTagTypes = ['board', 'boards'] as const;

const BoardsApi = apiService
   .enhanceEndpoints({
      addTagTypes,
   })
   .injectEndpoints({
      endpoints: build => ({
         getBoards: build.query<ListResult<IBoard>, RoutedInput<ListInputBoard>>({
            query: params => ({ 
               url: `admin/${params.jurisdiction_id}/board/find`,
               method: 'GET',
               params: params.input
            }),
            providesTags: ['boards']
         }),
			getBoard: build.query<ItemResult<IBoard>, RoutedInput<string>>({
				query: params => ({ 
					url: `admin/${params.jurisdiction_id}/board/${params.input}`,
					method: 'GET'
				}),
				providesTags: ['board']
			}),
			getBoardPublic: build.query<ItemResult<IBoard_Public>, RoutedInput<string>>({
				query: (params) => ({ 
					url: `admin/${params.jurisdiction_id}/board/${params.input}/public`,
          			method: 'GET',
				}),
				providesTags: ['board']
			}),
			deleteBoard: build.mutation<ActionResult, RoutedInput<string>>({
				query: (params) => ({
					url: `admin/${params.jurisdiction_id}/board/${params.input}`,
					method: 'DELETE'
				}),
				invalidatesTags: ['board', 'boards']
			}),
			createBoard: build.mutation<ItemResult<IBoard>, IBoard>({
				query: (board) => {
					return {
						url: `admin/${board.jurisdiction_id}/board`,
						method: 'POST',
						data: board
					};
				},
				invalidatesTags: ['board', 'boards']
			}),replaceBoard: build.mutation<ItemResult<IBoard>, IBoard>({
				query: (board) => ({
					url: `admin/${board.jurisdiction_id}/board/${board._id}`,
					method: 'PUT',
					data: board
				}),
				invalidatesTags: ['board','boards']
			})
		}),
		overrideExisting: false
	});

export default BoardsApi;

export const {
	useGetBoardsQuery,
	useGetBoardPublicQuery,
	useGetBoardQuery,
	useDeleteBoardMutation,
	useCreateBoardMutation,useReplaceBoardMutation,
	endpoints: boardEndpoints
} = BoardsApi;

export type BoardsApiType = {
	[BoardsApi.reducerPath]: ReturnType<typeof BoardsApi.reducer>;
};