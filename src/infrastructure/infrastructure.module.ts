import { Module } from '@nestjs/common';
import { PuppeteerModule } from './puppeteer/puppeteer.module';
import { AwsModule } from './aws/aws.module';

@Module({
  imports: [PuppeteerModule, AwsModule],
  exports: [PuppeteerModule, AwsModule],
})
export class InfrastructureModule { }
