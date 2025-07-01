import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export interface BitcoinMarketData {
    id: string;
    timestamp: number;
    dataType: 'bitcoin-analysis';
    data: any;
    metadata: {
        recordsCount: number;
        generatedAt: string;
        dataRange: string;
        processingTimeMs: number;
    };
    ttl?: number; // Para expiração automática (opcional)
}

@Injectable()
export class DynamoDbService {
    private readonly logger = new Logger(DynamoDbService.name);
    private dynamoDbClient: DynamoDBClient;
    private dynamoDb: DynamoDBDocumentClient;
    private readonly tableName = 'bitcoin-market-data';

    constructor(private configService: ConfigService) {
        this.initializeDynamoDB();
    }

    private initializeDynamoDB(): void {
        try {
            // Validar credenciais AWS
            const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
            const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
            const region = this.configService.get<string>('AWS_REGION', 'us-east-1');

            if (!accessKeyId || !secretAccessKey) {
                throw new Error('AWS credentials não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env');
            }

            // Configurar cliente DynamoDB (v3)
            this.dynamoDbClient = new DynamoDBClient({
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

            // Document client para trabalhar com JSON diretamente
            this.dynamoDb = DynamoDBDocumentClient.from(this.dynamoDbClient, {
                marshallOptions: {
                    removeUndefinedValues: true, // Remove valores undefined automaticamente
                    convertEmptyValues: false,
                },
            });
            this.logger.log('✅ DynamoDB v3 inicializado com sucesso');
            this.logger.log(`🌍 Região AWS: ${region}`);
        } catch (error) {
            this.logger.error('❌ Erro ao inicializar DynamoDB v3:', error);
            throw new Error(`Falha na inicialização do DynamoDB v3: ${error.message}`);
        }
    }

    async saveBitcoinData(data: any, metadata: any): Promise<string> {
        const startTime = Date.now();
        const id = uuidv4();
        const timestamp = Date.now();

        const item: BitcoinMarketData = {
            id,
            timestamp,
            dataType: 'bitcoin-analysis',
            data,
            metadata: {
                ...metadata,
                generatedAt: new Date().toISOString(),
                processingTimeMs: Date.now() - startTime,
            },
            // TTL opcional: expira em 30 dias (free tier friendly)
            ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        };

        try {
            this.logger.log(`💾 Salvando dados no DynamoDB v3 (ID: ${id})...`);

            const command = new PutCommand({
                TableName: this.tableName,
                Item: item,
            });

            await this.dynamoDb.send(command);

            const saveTime = Date.now() - startTime;
            this.logger.log(`✅ Dados salvos no DynamoDB v3 em ${saveTime}ms (ID: ${id})`);

            return id;
        } catch (error) {
            const saveTime = Date.now() - startTime;
            this.logger.error(`❌ Erro ao salvar no DynamoDB v3 após ${saveTime}ms:`, error);
            throw new Error('Falha ao salvar dados no DynamoDB v3');
        }
    }

    async getLatestBitcoinData(): Promise<BitcoinMarketData | null> {
        const startTime = Date.now();

        try {
            this.logger.log('🔍 Buscando dados mais recentes no DynamoDB v3...');

            const command = new ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'dataType = :dataType',
                ExpressionAttributeValues: {
                    ':dataType': 'bitcoin-analysis',
                },
            });

            const result = await this.dynamoDb.send(command);

            if (!result.Items || result.Items.length === 0) {
                this.logger.log('📭 Nenhum dado encontrado no DynamoDB v3');
                return null;
            }

            // Ordenar por timestamp e pegar o mais recente
            const sortedItems = result.Items
                .sort((a, b) => b.timestamp - a.timestamp);

            const latestItem = sortedItems[0] as BitcoinMarketData;

            const searchTime = Date.now() - startTime;
            this.logger.log(`✅ Dados encontrados no DynamoDB v3 em ${searchTime}ms (ID: ${latestItem.id})`);
            this.logger.log(`📊 Dados de: ${latestItem.metadata.generatedAt}`);

            return latestItem;
        } catch (error) {
            const searchTime = Date.now() - startTime;
            this.logger.error(`❌ Erro ao buscar no DynamoDB v3 após ${searchTime}ms:`, error);
            throw new Error('Falha ao buscar dados no DynamoDB v3');
        }
    }

    async getBitcoinDataById(id: string): Promise<BitcoinMarketData | null> {
        const startTime = Date.now();

        try {
            this.logger.log(`🔍 Buscando dados por ID: ${id}...`);

            const command = new GetCommand({
                TableName: this.tableName,
                Key: { id },
            });

            const result = await this.dynamoDb.send(command);

            if (!result.Item) {
                this.logger.log(`📭 Nenhum dado encontrado com ID: ${id}`);
                return null;
            }

            const searchTime = Date.now() - startTime;
            this.logger.log(`✅ Dados encontrados por ID em ${searchTime}ms`);

            return result.Item as BitcoinMarketData;
        } catch (error) {
            const searchTime = Date.now() - startTime;
            this.logger.error(`❌ Erro ao buscar por ID após ${searchTime}ms:`, error);
            throw new Error('Falha ao buscar dados por ID no DynamoDB v3');
        }
    }

    async listRecentBitcoinData(limit: number = 10): Promise<BitcoinMarketData[]> {
        const startTime = Date.now();

        try {
            this.logger.log(`📋 Listando últimos ${limit} registros no DynamoDB v3...`);

            const command = new ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'dataType = :dataType',
                ExpressionAttributeValues: {
                    ':dataType': 'bitcoin-analysis',
                },
                Limit: limit * 2, // Buscar mais para garantir que temos dados após filtro
            });

            const result = await this.dynamoDb.send(command);

            if (!result.Items || result.Items.length === 0) {
                this.logger.log('📭 Nenhum dado encontrado no DynamoDB v3');
                return [];
            }

            // Ordenar por timestamp e pegar os mais recentes
            const sortedItems = result.Items
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);

            const searchTime = Date.now() - startTime;
            this.logger.log(`✅ ${sortedItems.length} registros encontrados em ${searchTime}ms`);

            return sortedItems as BitcoinMarketData[];
        } catch (error) {
            const searchTime = Date.now() - startTime;
            this.logger.error(`❌ Erro ao listar dados após ${searchTime}ms:`, error);
            throw new Error('Falha ao listar dados no DynamoDB v3');
        }
    }

    async getDataStats(): Promise<any> {
        try {
            this.logger.log('📊 Coletando estatísticas do DynamoDB v3...');

            const command = new ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'dataType = :dataType',
                ExpressionAttributeValues: {
                    ':dataType': 'bitcoin-analysis',
                },
                ProjectionExpression: 'id, #ts, metadata.generatedAt, metadata.recordsCount',
                ExpressionAttributeNames: {
                    '#ts': 'timestamp',
                },
            });

            const result = await this.dynamoDb.send(command);

            if (!result.Items || result.Items.length === 0) {
                return {
                    totalRecords: 0,
                    oldestRecord: null,
                    newestRecord: null,
                    averageRecordsCount: 0,
                };
            }

            const items = result.Items.sort((a, b) => a.timestamp - b.timestamp);
            const totalRecords = items.length;
            const oldestRecord = items[0];
            const newestRecord = items[totalRecords - 1];
            const averageRecordsCount = Math.round(
                items.reduce((sum, item) => sum + (item.metadata?.recordsCount || 0), 0) / totalRecords
            );

            this.logger.log(`✅ Estatísticas coletadas: ${totalRecords} registros`);

            return {
                totalRecords,
                oldestRecord: {
                    id: oldestRecord.id,
                    generatedAt: oldestRecord.metadata?.generatedAt,
                    recordsCount: oldestRecord.metadata?.recordsCount,
                },
                newestRecord: {
                    id: newestRecord.id,
                    generatedAt: newestRecord.metadata?.generatedAt,
                    recordsCount: newestRecord.metadata?.recordsCount,
                },
                averageRecordsCount,
            };
        } catch (error) {
            this.logger.error('❌ Erro ao coletar estatísticas:', error);
            throw new Error('Falha ao coletar estatísticas do DynamoDB v3');
        }
    }
} 