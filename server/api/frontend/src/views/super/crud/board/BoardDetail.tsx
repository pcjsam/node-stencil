import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import classNames from '@/utils/classNames';
import { Meta } from '@/@types/routes';
import { ActionLink, AdaptiveCard } from '@/components/shared';
import { IBoard } from '@/stencil/models/entities/board';

import BoardEditor from './BoardEditor';
import { useGetBoardQuery } from '@/stencil/endpoints/entities/boardApi';

import Loading from '@/components/shared/Loading';
import JurisdictionCrumb, { navigationForJurisdiction } from '../jurisdiction/JurisdictionCrumb';

type BoardDetailProps = Meta & {
   className?: string;
};

function BoardDetail(props: BoardDetailProps) {
   const { className } = props;
   
   // For tenant=Route, the URL segment is :idAlias (e.g. :jurisdiction_id), not :_id.
   const { _id, jurisdiction_id } = useParams();
   const navigate = useNavigate();
   const { t } = useTranslation();

   const boardQueryInput = {
         jurisdiction_id: jurisdiction_id!,
         input: _id!
      };

	let board = useGetBoardQuery(boardQueryInput, { refetchOnMountOrArgChange: true, skip: !_id });

   const onDelete = function (board: IBoard) {
      navigate(navigationForJurisdiction(board.jurisdiction_id));
   };

   return (
      <div className={classNames('', className)}>
      
         <div className="flex flex-row gap-2 mb-4 ml-2">
            <JurisdictionCrumb _id={board.data?.item?.jurisdiction_id} />
            <span >&gt;</span>
            Board
         </div>
         <AdaptiveCard>
            <div className="flex flex-col gap-4">
               <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="flex flex-row">Board<Loading loading={board.isLoading} type="inline" className="ml-4" /></h3>
                  
                  <BoardEditor is_create={false} onDelete={onDelete} _id={_id!} jurisdiction_id={jurisdiction_id!} />
                  
               </div>
               <div className="flex flex-col gap-2" >
                  <div>
                     Name: <b>{board.data?.item?.board_name}</b></div>
                  
               </div>
            </div>
         </AdaptiveCard>

         
      </div>
   );
}

export default BoardDetail;