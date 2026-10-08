import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import _ from 'lodash';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { zodResolver } from '@hookform/resolvers/zod';
import Board, { IBoard } from '@/stencil/models/entities/board';
import { useDeleteBoardMutation, useCreateBoardMutation, useReplaceBoardMutation, useGetBoardQuery } from '@/stencil/endpoints/entities/boardApi';
import { closeModal, openModal } from '@/components/ui/Dialog/modalSlice';
import { useAppDispatch } from '@/store/rootStore';
import { Button, Checkbox, DatePicker, Dialog, Form, FormItem, Input } from '@/components/ui';
import NullableCheckbox from '@/views/super/common/NullableCheckbox';

import JurisdictionPicker from '@/views/super/pickers/JurisdictionPicker';
import classNames from '@/utils/classNames';
import moment from 'moment';
import StencilUtils from '@/utils/stencilUtils';
import { TbEdit, TbPlus } from 'react-icons/tb';

import Alert from '@/components/shared/Alert';
import NestedEditor from '../NestedEditor';
import { PiX } from 'react-icons/pi';


type FormType = {
   _id?: IBoard["_id"];
   jurisdiction_id: IBoard["jurisdiction_id"];
   account_id_creator: IBoard["account_id_creator"];
   board_name: IBoard["board_name"];
   board_description?: IBoard["board_description"];
   
};

const schema = z.object({
   _id: z.string().optional(),
   jurisdiction_id: z.string().max(10, 'Cannot be more than 10 characters.'),
   account_id_creator: z.string(),
   board_name: z.string().max(200, 'Cannot be more than 200 characters.'),
   board_description: z.string().max(500, 'Cannot be more than 500 characters.').optional()
});

type BoardEditorProps = {
	className?: string;
   is_create: boolean;
   onDelete?: (board: IBoard) => void;
   onCreate?: (board: IBoard) => void;
   jurisdiction_id: string;
   
   _id?: string;
};


function BoardEditor(props: BoardEditorProps) {
	const dispatch = useAppDispatch();
	const { className, _id, is_create, jurisdiction_id, onCreate, onDelete } = props;
	const [openDialog, setOpenDialog] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [targetBoardId, setTargetBoardId] = useState<string>();
	const [original, setOriginal] = useState<IBoard>();

   const defaultValues: FormType = {
		jurisdiction_id: jurisdiction_id,
		account_id_creator: '',
		board_name: '',
		board_description: undefined,
		
	};
	const formMethods = useForm<FormType>({
		mode: 'onChange',
		defaultValues,
		resolver: zodResolver(schema) as any
	});
   const { handleSubmit, formState, control, reset, setValue, trigger } = formMethods;
	const [createBoard] = useCreateBoardMutation();
	const [replaceBoard] = useReplaceBoardMutation();
	const [deleteBoard] = useDeleteBoardMutation();

	const { isValid, dirtyFields, errors } = formState;

	const { t } = useTranslation();
   
   const boardQueryInput = {
      jurisdiction_id: jurisdiction_id!,
		input: _id!
	};
   
   
	let board = useGetBoardQuery(boardQueryInput, { refetchOnMountOrArgChange: true, skip: !openDialog || !_id });

   useEffect(() => {
      if (!_id) {
         if (!targetBoardId){
            setTargetBoardId(uuidv4());
         }
      } else {
         setTargetBoardId(_id);
      }
   }, [_id]);

   useEffect(() => {
      if (openDialog && board?.data?.item) {
         reset(board.data.item);
         setOriginal(board.data.item);
      }
   }, [openDialog, board]);

	function handleOpenDialog() {
		setOpenDialog(true);
	}

	function handleCloseDialog() {
		setOpenDialog(false);
	}

	function handleDiscard() {
		clearForm();
		setOpenDialog(false);
	}

   function clearForm(){
      reset(defaultValues);
      if (!_id){
         setTargetBoardId(uuidv4());
      }
   }
	const confirmDelete = () => {
		dispatch(
			openModal({
				children: (
					<Alert
                  type='danger'
						onCancel={async () => {
							dispatch(closeModal());
						}}
						onConfirm={async () => {
							dispatch(closeModal());
							performDelete()
						}}
						children="Are you sure you want to delete this Board?"
						confirmText='Yes, Delete'
						/>
				)
			})
		);
	};

	function performDelete() {
      const deleteInstance = board.data?.item;
      if (!deleteInstance){
         return;
      }
		setSubmitting(true);
		deleteBoard({ jurisdiction_id: jurisdiction_id!, input: deleteInstance._id!})
			.unwrap()
			.then((resp) => {
				setSubmitting(false);
				if (!resp.success) {
					showError(resp.message || 'Error deleting data.');
				} else {
					handleCloseDialog();
               clearForm();
               if (onDelete) {
                  onDelete(deleteInstance);
               }
				}
			})
			.catch((ex) => {
				setSubmitting(false);
				const message = StencilUtils.getApiErrorMessage(ex, "Error deleting data.");
				showError(message);
			});
	}

   

	function onSubmit(data: FormType) {
      
      

      const apiData = { ...data };
    	const updatedBoard = Board(apiData);
		setSubmitting(true);

      let promise = is_create ? createBoard(updatedBoard) : replaceBoard(updatedBoard);
		promise
			.unwrap()
			.then((resp) => {
				setSubmitting(false);
				if (!resp.success) {
					showError(resp.message || 'Error saving data.');
				} else {
					setOpenDialog(false);
               clearForm();
               if (is_create && onCreate && resp.item) {
                  onCreate(resp.item);
               }
				}
			})
			.catch((ex) => {
				setSubmitting(false);
				const message = StencilUtils.getApiErrorMessage(ex, "Error saving data.");
				showError(message);
			});
	}

	function showError(message: string) {
		dispatch(
			openModal({
				children: (
					<Alert
                  type='danger'
						onCancel={async () => {
							dispatch(closeModal());
						}}
                  onConfirm={async () => {
                     dispatch(closeModal());
                  }}
						children={message}
						confirmText='Okay'
                  confirmOnly={true}
					/>
				)
			})
		);
	}

	return (
		<div className={classNames('', className)}>
         {
            is_create ? 
            <Button 
               variant="solid"
               type="button"
               color="primary"
               icon={<TbPlus className="text-xl" /> } onClick={handleOpenDialog} >
               Create
            </Button>
            :
            <Button 
               variant="default"
               type="button"
               size="xs"
               icon={<TbEdit /> } onClick={handleOpenDialog} >
               Edit
            </Button>
         }
			<Dialog
				isOpen={openDialog}
				onClose={handleCloseDialog}
            width={800}
			>
            <Dialog.Header>
               <h4 className="mb-4">
                  {is_create ? 'Create' : 'Edit'} Board
               </h4>
				</Dialog.Header>
            <FormProvider {...formMethods}>
               <Form
                  onSubmit={handleSubmit(onSubmit)}
                  className="flex flex-col"
               >
                  <Dialog.Body scrollable={true}>
                     <div className='p-2 sm:p-0' >
                        
                        
                        <FormItem
                           label="Account ID Creator"
                           invalid={Boolean(errors.account_id_creator)}
                           errorMessage={errors.account_id_creator?.message}
                        >
                           
                           <Controller
                              name="account_id_creator"
                              control={control}
                              render={({ field }) => (
                                 <Input
                                    {...field}
                                    className="mb-2"
                                    id="account_id_creator"
                                    required
                                 />
                              )}
                           />
                           
                        </FormItem>
                        
                     
                        <FormItem
                           label="Boardname"
                           invalid={Boolean(errors.board_name)}
                           errorMessage={errors.board_name?.message}
                        >
                           
                           <Controller
                              name="board_name"
                              control={control}
                              render={({ field }) => (
                                 <Input
                                    {...field}
                                    className="mb-2"
                                    id="board_name"
                                    required
                                 />
                              )}
                           />
                           
                        </FormItem>
                        
                     
                        <FormItem
                           label="Board Description"
                           invalid={Boolean(errors.board_description)}
                           errorMessage={errors.board_description?.message}
                        >
                           
                           <Controller
                              name="board_description"
                              control={control}
                              render={({ field }) => (
                                 <Input
                                    {...field}
                                    className="mb-2"
                                    id="board_description"
                                 />
                              )}
                           />
                           
                        </FormItem>
                        
                     
                     </div>
                  </Dialog.Body>
               
                  <Dialog.Footer>
                     <div className="flex flex-row justify-end space-x-2">
                        <div className="">
                           <Button
                              variant="default"
                              color="default"
                              type="button"
                              onClick={handleDiscard}
                           >
                              Cancel
                           </Button>
                           {
                              !is_create &&original && original._id &&
                              <Button
                                 variant="plain"
                                 color="error"
                                 className="ml-8"
                                 type="button"
                                 onClick={confirmDelete}
                                 disabled={submitting}
                              >
                                 Delete
                              </Button>
                           }
                        </div>

                        <div className="flex-1">
                        </div>

                        <div className="flex flex-row items-center space-x-8">
                           <Button
                              variant="solid"
                              color="primary"
                              type="submit"
                              disabled={board.isLoading || !isValid || submitting}
                           >
                              {is_create ? 'Create' : 'Update'}
                           </Button>
                        </div>
                     </div>

                  </Dialog.Footer>
               </Form>
            </FormProvider>
			</Dialog>
		</div>
	);
}

export default BoardEditor;