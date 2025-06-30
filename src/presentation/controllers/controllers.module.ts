import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { BitcoinController } from './bitcoin.controller';

@Module({
    imports: [ApplicationModule],
    controllers: [BitcoinController],
    exports: [],
})
export class ControllersModule { }
