import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PuppeteerService } from './puppeteer.service';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [HttpModule, AwsModule],
  providers: [PuppeteerService],
  exports: [PuppeteerService],
})
export class PuppeteerModule { }
