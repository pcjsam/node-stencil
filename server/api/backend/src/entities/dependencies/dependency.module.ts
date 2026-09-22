import { Global, Module } from '@nestjs/common';
import { DependencyCoordinator } from './dependency-coordinator';

/**
 * Provides the generated DependencyCoordinator (STARTFILE from nest.dependency.xsl).
 * Coordinator resolves EntityRegistry lazily via ModuleRef to avoid circular DI.
 */
@Global()
@Module({
   providers: [DependencyCoordinator],
   exports: [DependencyCoordinator],
})
export class DependencyModule {}
