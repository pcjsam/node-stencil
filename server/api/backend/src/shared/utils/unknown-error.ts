export function errorMessage(error: unknown): string {
   if (error instanceof Error) {
      return error.message;
   }
   return String(error);
}

export function errorStack(error: unknown): string | undefined {
   return error instanceof Error ? error.stack : undefined;
}

export function errorName(error: unknown): string | undefined {
   if (typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string') {
      return error.name;
   }
   return undefined;
}

export function errorCode(error: unknown): number | string | undefined {
   if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = error.code;
      if (typeof code === 'number' || typeof code === 'string') {
         return code;
      }
   }
   return undefined;
}

export function errorStatusCode(error: unknown): number | undefined {
   if (typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
   }
   return undefined;
}
