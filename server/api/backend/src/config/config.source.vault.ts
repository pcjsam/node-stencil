import { IConfigSource } from './config.types';
import { errorMessage } from 'src/shared/utils/unknown-error';

export class VaultConfigSource implements IConfigSource {
   constructor(
      public readonly name: string,
      private readonly vaultUrl: string,
      private readonly secretPrefix?: string
   ) {}

   async getValue(key: string): Promise<string | undefined> {
      try {
         // TODO: Implement secret store integration
         // This is a passthrough implementation that returns undefined
         // to fall back to environment variables
         return undefined;
      } catch (error) {
         console.error(`Error fetching secret: ${errorMessage(error)}`);
         return undefined;
      }
   }
}
