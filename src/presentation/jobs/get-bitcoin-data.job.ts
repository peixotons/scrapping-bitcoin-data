import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GetBitcoinDataUseCase } from 'src/application/use-case/get-bitcoin-data/get-bitcoin-data.use-case';

@Injectable()
export class GetBitcoinDataJob {
  constructor(private readonly getBitcoinDataUseCase: GetBitcoinDataUseCase) {}

  @Cron(CronExpression.EVERY_10_HOURS)
  async handleCron() {
    try {
      const data = await this.getBitcoinDataUseCase.execute();
      console.log('Bitcoin data fetched successfully:', data);
    } catch (error) {
      console.error('Error fetching Bitcoin data:', error);
    }
  }
}
