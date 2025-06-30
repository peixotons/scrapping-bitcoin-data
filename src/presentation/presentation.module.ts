import { Module } from '@nestjs/common';
import { ApplicationModule } from 'src/application/application.module';
import { JobsModule } from './jobs/jobs.module';
import { ControllersModule } from './controllers/controllers.module';

@Module({
    imports: [ApplicationModule, JobsModule, ControllersModule],
    controllers: [],
})
export class PresentationModule { }
