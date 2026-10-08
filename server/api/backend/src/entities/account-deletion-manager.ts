import { EntityRegistry } from './entity.registry';

export interface IAccountDeletionManager {
   deleteAllForAccount(jurisdiction_id: string, account_id: string): Promise<number>;
}

export type AccountDeletionPhase = string;

export interface AccountDeletionStep {
   entity: string;
   manager: IAccountDeletionManager;
   phase: AccountDeletionPhase;
   order: number;
}

export interface AccountReleasedStep {
   entity: string;
   releaseAllForAccount(account_id: string): Promise<number>;
}

export interface AccountAuthDeletionStep {
   entity: string;
   deleteByAuthIdentifier(auth_identifier: string): Promise<boolean>;
}

export interface AccountFederatedDeletionContext {
   jurisdiction_id: string;
   account_id: string;
}

export interface AccountFederatedDeletionResult {
   entity: string;
   jurisdiction_id: string;
   deleted_count: number;
}

export interface AccountFederatedDeletionStep {
   entity: string;
   deleteRemoteForAccount(context: AccountFederatedDeletionContext): Promise<AccountFederatedDeletionResult[]>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IAccountFederatedDeletionHandler {
}

export class AccountDeletionManagerRegistry {
   static getGeneratedManagers(entities: EntityRegistry): AccountDeletionStep[] {
      return [
         { entity: 'JurisdictionAsset', manager: entities.jurisdictionAssetManager, phase: 'storage', order: 10 },
         { entity: 'Account', manager: entities.accountManager, phase: 'account', order: 20 },
         { entity: 'Board', manager: entities.boardManager, phase: 'content', order: 15 },
      ];
   }

   static getGeneratedReleasedManagers(entities: EntityRegistry): AccountReleasedStep[] {
      return [
      ];
   }

   static getGeneratedAuthDeletionManagers(entities: EntityRegistry): AccountAuthDeletionStep[] {
      return [
         { entity: 'GlobalAccount', deleteByAuthIdentifier: (auth_identifier: string) => entities.globalAccountManager.deleteByAuthIdentifier(auth_identifier) },
      ];
   }

   static getGeneratedFederatedManagers(_handler: IAccountFederatedDeletionHandler): AccountFederatedDeletionStep[] {
      return [
      ];
   }
}