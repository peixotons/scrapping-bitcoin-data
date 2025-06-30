import { Module } from '@nestjs/common';
import { DomainModule } from 'src/domain/domain.module';
import { GetBitcoinDataUseCase } from './use-case/get-bitcoin-data/get-bitcoin-data.use-case';
import { InfrastructureModule } from 'src/infrastructure/infrastructure.module';

@Module({
  imports: [DomainModule, InfrastructureModule],
  providers: [GetBitcoinDataUseCase],
  exports: [GetBitcoinDataUseCase],
})
export class ApplicationModule {}
