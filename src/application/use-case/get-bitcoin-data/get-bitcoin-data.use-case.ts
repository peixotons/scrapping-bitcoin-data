import { Injectable } from '@nestjs/common';
import { PuppeteerService } from 'src/infrastructure/puppeteer/puppeteer.service';

@Injectable()
export class GetBitcoinDataUseCase {
  constructor(private readonly puppeteerService: PuppeteerService) {}
  async execute(): Promise<any> {
    return this.puppeteerService.scrapeBitcoinData();
  }
}
