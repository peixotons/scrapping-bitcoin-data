import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { GetBitcoinDataUseCase } from '../../application/use-case/get-bitcoin-data/get-bitcoin-data.use-case';
import {
    BitcoinAnalysisResponseDto,
    CurrentAnalysisDto,
    MetadataDto,
} from '../../application/dto/bitcoin-analysis.dto';

interface BitcoinDataWithIndicators {
    date: string;
    open: string;
    close: string;
    movingAverage200?: number;
    mayerMultiple?: number;
    fearGreedValue?: number;
    fearGreedClassification?: string;
}

@Controller('api/v1/bitcoin')
export class BitcoinController {
    private readonly logger = new Logger(BitcoinController.name);

    constructor(private readonly getBitcoinDataUseCase: GetBitcoinDataUseCase) { }

    @Get('health')
    getHealth() {
        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'Bitcoin Market Intelligence API',
            version: '1.0.0',
        };
    }

    @Get('analysis')
    async getCompleteAnalysis(): Promise<BitcoinAnalysisResponseDto> {
        const startTime = Date.now();
        this.logger.log('Starting Bitcoin analysis request');

        try {
            const data = await this.getBitcoinDataUseCase.execute();

            if (!data || data.length === 0) {
                throw new HttpException(
                    'No Bitcoin data available',
                    HttpStatus.NO_CONTENT,
                );
            }

            const response = this.formatResponse(data);

            const duration = Date.now() - startTime;
            this.logger.log(
                `Bitcoin analysis completed successfully in ${duration}ms`,
            );

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(
                `Bitcoin analysis failed after ${duration}ms`,
                error.stack,
            );

            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Failed to retrieve Bitcoin analysis',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private formatResponse(
        data: BitcoinDataWithIndicators[],
    ): BitcoinAnalysisResponseDto {
        const latest = data[data.length - 1];
        const oldest = data[0];

        const currentAnalysis: CurrentAnalysisDto = {
            price: this.parsePrice(latest.close),
            mayerMultiple: latest.mayerMultiple || 0,
            mayerStatus: this.getMayerStatus(latest.mayerMultiple || 0),
            fearGreedValue: latest.fearGreedValue || 0,
            fearGreedStatus: this.getFearGreedStatus(
                latest.fearGreedValue || 0,
                latest.fearGreedClassification || '',
            ),
            recommendation: this.getRecommendation(
                latest.mayerMultiple || 0,
                latest.fearGreedValue || 0,
            ),
            confidenceLevel: this.getConfidenceLevel(
                latest.mayerMultiple || 0,
                latest.fearGreedValue || 0,
            ),
        };

        const metadata: MetadataDto = {
            totalRecords: data.length,
            dataRange: `${oldest.date} to ${latest.date}`,
            lastUpdate: new Date().toISOString(),
        };

        return {
            success: true,
            meta: metadata,
            data: data.map((item) => ({
                date: item.date,
                open: item.open,
                close: item.close,
                movingAverage200: item.movingAverage200,
                mayerMultiple: item.mayerMultiple
                    ? Number(item.mayerMultiple.toFixed(3))
                    : undefined,
                fearGreedValue: item.fearGreedValue,
                fearGreedClassification: item.fearGreedClassification,
            })),
            currentAnalysis,
        };
    }

    private parsePrice(priceString: string): number {
        return parseFloat(priceString.replace(/,/g, ''));
    }

    private getMayerStatus(mayer: number): string {
        if (!mayer) return 'N/A';
        if (mayer < 1.0) return 'Undervalued';
        if (mayer <= 2.4) return 'Neutral';
        return 'Overvalued';
    }

    private getFearGreedStatus(value: number, classification: string): string {
        if (!value) return 'N/A';
        const emoji = this.getFearGreedEmoji(value);
        return `${emoji} ${classification}`;
    }

    private getFearGreedEmoji(value: number): string {
        if (value <= 24) return '😨';
        if (value <= 49) return '😟';
        if (value <= 74) return '😊';
        return '🤑';
    }

    private getRecommendation(mayer: number, fearGreed: number): string {
        if (!mayer || !fearGreed) return 'Insufficient data';

        const isLowMayer = mayer < 1.0;
        const isHighMayer = mayer > 2.4;
        const isExtremeFear = fearGreed <= 24;
        const isExtremeGreed = fearGreed >= 75;

        if (isLowMayer && isExtremeFear)
            return 'Strong Buy: Exceptional opportunity';
        if (isHighMayer && isExtremeGreed) return 'High Caution: Elevated risk';
        if (isLowMayer || isExtremeFear) return 'Moderate Buy: Favorable indicator';
        if (isHighMayer || isExtremeGreed) return 'Caution: Unfavorable indicator';
        return 'Neutral: Wait for clearer signals';
    }

    private getConfidenceLevel(mayer: number, fearGreed: number): string {
        if (!mayer || !fearGreed) return 'Low';

        const isLowMayer = mayer < 1.0;
        const isHighMayer = mayer > 2.4;
        const isExtremeFear = fearGreed <= 24;
        const isExtremeGreed = fearGreed >= 75;

        if ((isLowMayer && isExtremeFear) || (isHighMayer && isExtremeGreed)) {
            return 'High';
        }
        if (isLowMayer || isExtremeFear || isHighMayer || isExtremeGreed) {
            return 'Medium';
        }
        return 'Low';
    }
}
