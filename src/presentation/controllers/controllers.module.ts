import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';
import { BitcoinController } from './bitcoin.controller';
import { BitcoinDataController } from './bitcoin-data.controller';

@Module({
    imports: [ApplicationModule, InfrastructureModule],
    controllers: [BitcoinController, BitcoinDataController],
    exports: [],
})
export class ControllersModule { }
