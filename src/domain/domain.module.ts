import { Module } from '@nestjs/common';
import { InfrastructureModule } from 'src/infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  providers: [],
  exports: [InfrastructureModule],
})
export class DomainModule {}
