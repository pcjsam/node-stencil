import { CollectionDefinition } from '../types/mongo/collection-definition.types';

const schemaRegistry = new Map<string, CollectionDefinition>();

export function registerSchema(info: CollectionDefinition) {
   schemaRegistry.set(info.name, info);
}

export function getAllSchemas(): CollectionDefinition[] {
   return Array.from(schemaRegistry.values());
}

/**
 * True when the named collection is registered with at least one Queryable Encryption field.
 * Multi-document delete/update on those collections must use per-id ops; QE rejects deleteMany.
 */
export function hasEncryptedFields(name: string): boolean {
   const def = schemaRegistry.get(name);
   return !!def?.encryptedFields && def.encryptedFields.length > 0;
}
