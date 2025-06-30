import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PresentationModule } from './presentation/presentation.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PresentationModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
