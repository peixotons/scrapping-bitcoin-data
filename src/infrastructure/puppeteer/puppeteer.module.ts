import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PuppeteerService } from './puppeteer.service';

@Module({
  imports: [HttpModule],
  providers: [PuppeteerService],
  exports: [PuppeteerService],
})
export class PuppeteerModule {}
