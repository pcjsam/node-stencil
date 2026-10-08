import { ActionLink } from '@/components/shared';
import JurisdictionCrumb from '../jurisdiction/JurisdictionCrumb';

export function navigationForBoard(jurisdiction_id?: string, _id?: string) {
   return `/super/jurisdiction/${jurisdiction_id}/board/${_id}`;
}

type BoardCrumbProps = {
   as_root?:boolean;
   _id?: string;
   jurisdiction_id: string;
}
function BoardCrumb({_id, as_root = false, jurisdiction_id}: BoardCrumbProps) {
   return (
      <>{/* //TODO:SHOULD:WILL:Crud Crumbs */}
         <JurisdictionCrumb  />
         
         { 
            !as_root &&
            <>
            <span>&gt;</span>
            <ActionLink to={navigationForBoard(jurisdiction_id, _id)}>Board</ActionLink>
            </>
         }
      </>
   );
}

export default BoardCrumb;