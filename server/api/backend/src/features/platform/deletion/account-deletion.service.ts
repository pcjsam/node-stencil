import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntityRegistry } from 'src/entities/entity.registry';
import {
   AccountDeletionManagerRegistry,
   IAccountFederatedDeletionHandler,
} from 'src/entities/account-deletion-manager';
import { AUTH_PROVIDER, IAuthProvider } from 'src/shared/access-control/auth-provider/auth-provider.interface';

export interface AccountErasureEntityResult {
   entity: string;
   deleted_count: number;
   jurisdiction_id?: string;
}

export interface AccountErasureResult {
   entities: AccountErasureEntityResult[];
   identity_revoked: boolean;
}

@Injectable()
export class AccountDeletionService {
   private readonly logger = new Logger(AccountDeletionService.name);

   constructor(
      private readonly entities: EntityRegistry,
      @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
   ) {}

   /**
    * Physical account erasure. Walks the XML-generated registry; does not tombstone.
    * Callers own confirmation, export, and audit records.
    */
   async eraseAccount(
      jurisdiction_id: string,
      account_id: string,
      auth_identifier: string,
      federatedHandler?: IAccountFederatedDeletionHandler,
   ): Promise<AccountErasureResult> {
      const safeAccount = this.truncateId(account_id);
      this.logger.log(`Starting account erasure for ${safeAccount} in ${jurisdiction_id}`);

      const results: AccountErasureEntityResult[] = [];
      const steps = [...AccountDeletionManagerRegistry.getGeneratedManagers(this.entities)];

      if (federatedHandler) {
         const federated = AccountDeletionManagerRegistry.getGeneratedFederatedManagers(federatedHandler);
         for (const step of federated) {
            const remoteResults = await step.deleteRemoteForAccount({ jurisdiction_id, account_id });
            results.push(...remoteResults);
         }
      }

      steps.sort((a, b) => a.order - b.order);
      for (const step of steps) {
         const deleted_count = await step.manager.deleteAllForAccount(jurisdiction_id, account_id);
         results.push({ entity: step.entity, deleted_count });
      }

      for (const release of AccountDeletionManagerRegistry.getGeneratedReleasedManagers(this.entities)) {
         const deleted_count = await release.releaseAllForAccount(account_id);
         results.push({ entity: release.entity, deleted_count });
      }

      for (const authStep of AccountDeletionManagerRegistry.getGeneratedAuthDeletionManagers(this.entities)) {
         try {
            const deleted = await authStep.deleteByAuthIdentifier(auth_identifier);
            results.push({ entity: authStep.entity, deleted_count: deleted ? 1 : 0 });
         } catch (error) {
            this.logger.warn(`Failed auth-mapping delete for ${authStep.entity}: ${error}`);
            results.push({ entity: authStep.entity, deleted_count: 0 });
         }
      }

      let identity_revoked = false;
      try {
         await this.authProvider.revokeUser(auth_identifier);
         identity_revoked = true;
      } catch (error) {
         this.logger.warn(`Identity revoke failed for ${this.truncateId(auth_identifier)}: ${error}`);
      }

      const total = results.reduce((sum, row) => sum + row.deleted_count, 0);
      this.logger.log(`Account erasure complete for ${safeAccount}: ${total} rows, identity_revoked=${identity_revoked}`);
      return { entities: results, identity_revoked };
   }

   private truncateId(value: string): string {
      if (!value) {
         return '';
      }
      return value.length <= 8 ? '***' : `${value.slice(0, 8)}***`;
   }
}
