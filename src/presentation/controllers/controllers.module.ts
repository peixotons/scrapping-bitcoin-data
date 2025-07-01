import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';
import { BitcoinController } from './bitcoin.controller';

@Module({
    imports: [ApplicationModule, InfrastructureModule],
    controllers: [BitcoinController],
    exports: [],
})
export class ControllersModule { }
