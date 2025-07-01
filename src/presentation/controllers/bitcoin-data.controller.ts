import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Logger,
    Param,
    Query,
} from '@nestjs/common';
import { DynamoDbService } from '../../infrastructure/aws/dynamodb.service';

@Controller('api/v1/bitcoin-data')
export class BitcoinDataController {
    private readonly logger = new Logger(BitcoinDataController.name);

    constructor(private readonly dynamoDbService: DynamoDbService) { }

    @Get('latest')
    async getLatestData() {
        const startTime = Date.now();
        this.logger.log('📊 Buscando dados mais recentes do DynamoDB');

        try {
            const data = await this.dynamoDbService.getLatestBitcoinData();

            if (!data) {
                throw new HttpException(
                    'Nenhum dado encontrado no DynamoDB',
                    HttpStatus.NOT_FOUND,
                );
            }

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Dados retornados do DynamoDB em ${duration}ms`);

            return {
                success: true,
                source: 'dynamodb',
                retrievedAt: new Date().toISOString(),
                retrievalTimeMs: duration,
                data: data.data,
                metadata: data.metadata,
                id: data.id,
                savedAt: data.metadata.generatedAt,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`❌ Erro ao buscar dados após ${duration}ms`, error.stack);

            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Erro interno ao buscar dados do DynamoDB',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('by-id/:id')
    async getDataById(@Param('id') id: string) {
        const startTime = Date.now();
        this.logger.log(`🔍 Buscando dados por ID: ${id}`);

        try {
            const data = await this.dynamoDbService.getBitcoinDataById(id);

            if (!data) {
                throw new HttpException(
                    `Nenhum dado encontrado com ID: ${id}`,
                    HttpStatus.NOT_FOUND,
                );
            }

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Dados encontrados por ID em ${duration}ms`);

            return {
                success: true,
                source: 'dynamodb',
                retrievedAt: new Date().toISOString(),
                retrievalTimeMs: duration,
                data: data.data,
                metadata: data.metadata,
                id: data.id,
                savedAt: data.metadata.generatedAt,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`❌ Erro ao buscar por ID após ${duration}ms`, error.stack);

            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Erro interno ao buscar dados por ID',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('history')
    async getDataHistory(@Query('limit') limit?: string) {
        const startTime = Date.now();
        const limitNumber = limit ? parseInt(limit, 10) : 10;

        this.logger.log(`📋 Listando histórico de dados (limite: ${limitNumber})`);

        try {
            const dataList = await this.dynamoDbService.listRecentBitcoinData(limitNumber);

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Histórico retornado em ${duration}ms (${dataList.length} registros)`);

            return {
                success: true,
                source: 'dynamodb',
                retrievedAt: new Date().toISOString(),
                retrievalTimeMs: duration,
                totalRecords: dataList.length,
                records: dataList.map(item => ({
                    id: item.id,
                    savedAt: item.metadata.generatedAt,
                    recordsCount: item.metadata.recordsCount,
                    dataRange: item.metadata.dataRange,
                    processingTimeMs: item.metadata.processingTimeMs,
                })),
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`❌ Erro ao listar histórico após ${duration}ms`, error.stack);

            throw new HttpException(
                'Erro interno ao listar histórico de dados',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('stats')
    async getDataStats() {
        const startTime = Date.now();
        this.logger.log('📈 Coletando estatísticas dos dados');

        try {
            const stats = await this.dynamoDbService.getDataStats();

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Estatísticas coletadas em ${duration}ms`);

            return {
                success: true,
                source: 'dynamodb',
                retrievedAt: new Date().toISOString(),
                retrievalTimeMs: duration,
                statistics: stats,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`❌ Erro ao coletar estatísticas após ${duration}ms`, error.stack);

            throw new HttpException(
                'Erro interno ao coletar estatísticas',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('health')
    getHealth() {
        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'Bitcoin Data API (DynamoDB v3)',
            version: '2.0.0',
            awsSdk: 'v3.693.0',
            features: ['Modular imports', 'Better performance', 'Native TypeScript'],
            endpoints: {
                latest: '/api/v1/bitcoin-data/latest',
                byId: '/api/v1/bitcoin-data/by-id/:id',
                history: '/api/v1/bitcoin-data/history?limit=10',
                stats: '/api/v1/bitcoin-data/stats',
            },
        };
    }
} 