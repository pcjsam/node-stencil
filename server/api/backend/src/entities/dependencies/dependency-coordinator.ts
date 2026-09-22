import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EntityRegistry } from '../entity.registry';


/**
 * Cascades iInvalidateForeignKey: when a child mutates, mark the FK parent dirty
 * (calculation_utc = null). Never throws to the writer — prefer stale/dirty parent
 * over failing the child's insert/replace/delete.
 *
 * Generated from stencil XML. Do not hand-edit.
 */
@Injectable()
export class DependencyCoordinator {
   private readonly logger = new Logger(DependencyCoordinator.name);
   private _entities?: EntityRegistry;

   constructor(private readonly moduleRef: ModuleRef) {}

   private get entities(): EntityRegistry {
      if (!this._entities) {
         this._entities = this.moduleRef.get(EntityRegistry, { strict: false });
      }
      return this._entities!;
   }

   private async safe(label: string, fn: () => Promise<void>): Promise<void> {
      try {
         await fn();
      } catch (err) {
         this.logger.warn(`iInvalidateForeignKey failed (${label}); parent left dirty/stale`, err as Error);
      }
   }

}