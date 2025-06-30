import { Module } from '@nestjs/common';
import { PuppeteerModule } from './puppeteer/puppeteer.module';

@Module({
  imports: [PuppeteerModule],
  exports: [PuppeteerModule],
})
export class InfrastructureModule {}
