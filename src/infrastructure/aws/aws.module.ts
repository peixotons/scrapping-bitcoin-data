import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamoDbService } from './dynamodb.service';

@Module({
    imports: [ConfigModule],
    providers: [DynamoDbService],
    exports: [DynamoDbService],
})
export class AwsModule { } 