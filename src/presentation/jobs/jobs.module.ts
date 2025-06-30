import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { GetBitcoinDataJob } from './get-bitcoin-data.job';

@Module({
  imports: [ApplicationModule],
  providers: [GetBitcoinDataJob],
})
export class JobsModule {}
