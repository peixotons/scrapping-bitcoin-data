import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { DynamoDbService } from '../aws/dynamodb.service';

interface BitcoinData {
  date: string;
  open: string;
  close: string;
}

interface FearGreedData {
  date: string;
  value: number;
  classification: string;
}

interface FearGreedApiResponse {
  data: {
    value: string;
    value_classification: string;
    timestamp: string;
  }[];
  metadata: { error: string | null };
}

interface BitcoinDataWithIndicators extends BitcoinData {
  movingAverage200?: number;
  mayerMultiple?: number;
  fearGreedValue?: number;
  fearGreedClassification?: string;
}

interface BitcoinDataWithMayer extends BitcoinData {
  movingAverage200?: number;
  mayerMultiple?: number;
}

@Injectable()
export class PuppeteerService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos

  constructor(
    private readonly httpService: HttpService,
    private readonly dynamoDbService: DynamoDbService,
  ) { }

  /**
   * Gera a URL do Yahoo Finance com períodos dinâmicos
   * period1: 1º de janeiro de 2018 (data inicial fixa para ter histórico suficiente)
   * period2: Data atual (sempre atualizada)
   */
  private generateYahooFinanceUrl(): string {
    // Data inicial fixa: 1º de janeiro de 2018
    const startDate = new Date('2018-01-01');
    const period1 = Math.floor(startDate.getTime() / 1000);

    // Data final: hoje (sempre atualizada)
    const endDate = new Date();
    const period2 = Math.floor(endDate.getTime() / 1000);

    console.log(`📅 Período: ${startDate.toLocaleDateString()} até ${endDate.toLocaleDateString()}`);
    console.log(`🔢 Timestamps: period1=${period1}, period2=${period2}`);

    return `https://finance.yahoo.com/quote/BTC-USD/history/?guce_referrer=aHR0cHM6Ly9jaGF0Z3B0LmNvbS8&guce_referrer_sig=AQAAAGC1TQxq2tHtAaEFZelG6GyHbXkLr5o71-Ufy2nkU4z3SCZDAjI6THEwud8rlVm3Q-w-xLk0C_R_kG5yLhp0gXpypvMI8ORpvc_Qk8ju3xajj327Vz9wUMHI9Z2DSdEye9TunuCOCk2S2wpMc3j6J11IP8VRLqMCVCwFQEwfRdy2&period1=${period1}&period2=${period2}`;
  }

  async scrapeBitcoinData(): Promise<BitcoinDataWithIndicators[]> {
    const startTime = Date.now();
    console.log('🚀 Iniciando captura de dados do Bitcoin...');

    // Verificar cache
    const cacheKey = 'bitcoin-data';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 Retornando dados do cache (10min TTL)');
      return cached.data;
    }

    console.log('🔧 Iniciando Chrome/Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      protocolTimeout: 240000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-images', '--disable-css'],
    });
    console.log('✅ Chrome iniciado com sucesso');

    try {
      console.log('📄 Criando nova página...');
      const page = await browser.newPage();
      console.log('✅ Nova página criada');

      console.log('🌐 Navegando para Yahoo Finance...');
      const navigationStart = Date.now();
      const yahooUrl = this.generateYahooFinanceUrl();
      await page.goto(
        yahooUrl,
        { waitUntil: 'domcontentloaded', timeout: 60000 } // Aumentado para t2.micro
      );
      const navigationTime = Date.now() - navigationStart;
      console.log(`✅ Página carregada em ${navigationTime}ms`);
      console.log('📂 Working dir:', process.cwd());
      await page.screenshot({ path: 'erro.png', fullPage: true });
      console.log('🔍 Procurando tabela de dados históricos...');

      const selectorStart = Date.now();
      await page.waitForSelector('table.yf-1jecxey.noDl.hideOnPrint', {
        timeout: 120000,
      });
      const selectorTime = Date.now() - selectorStart;
      console.log(`✅ Tabela encontrada em ${selectorTime}ms`);

      console.log('📊 Extraindo dados da tabela...');
      const bitcoinData = await this.extractTableData(page);
      console.log(`✅ Extraídos ${bitcoinData.length} registros do Bitcoin`);

      console.log('😱 Buscando dados do Fear & Greed Index...');
      const fearGreedData = await this.fetchFearGreedData();
      console.log(`✅ Recebidos ${fearGreedData.length} registros do Fear & Greed`);

      console.log('🧮 Calculando Mayer Multiple (média móvel 200 dias)...');
      const dataWithMayer = this.calculateMayerMultiple(bitcoinData);
      console.log(`✅ Mayer Multiple calculado para ${dataWithMayer.length} registros`);

      console.log('🔗 Combinando dados Bitcoin + Fear & Greed...');
      const dataWithIndicators = this.combineFearGreedData(
        dataWithMayer,
        fearGreedData,
      );
      console.log(`✅ Dados combinados: ${dataWithIndicators.length} registros`);

      console.log('📅 Filtrando dados de 2020 em diante...');
      const filteredData = this.filterDataFrom2020(dataWithIndicators);
      console.log(`✅ Dados filtrados: ${filteredData.length} registros finais`);

      this.logResults(filteredData);

      // Salvar no cache local
      this.cache.set(cacheKey, { data: filteredData, timestamp: Date.now() });
      console.log('💾 Dados salvos no cache local');

      // Salvar no DynamoDB v3
      try {
        console.log('☁️ Salvando dados no DynamoDB v3...');
        const metadata = {
          recordsCount: filteredData.length,
          dataRange: `${filteredData[0]?.date} to ${filteredData[filteredData.length - 1]?.date}`,
          processingTimeMs: Date.now() - startTime,
        };

        const dynamoId = await this.dynamoDbService.saveBitcoinData(filteredData, metadata);
        console.log(`✅ Dados salvos no DynamoDB v3 com ID: ${dynamoId}`);
      } catch (dynamoError) {
        console.error('⚠️ Erro ao salvar no DynamoDB v3 (continuando sem erro):', dynamoError.message);
        // Não falhar a operação se DynamoDB estiver indisponível
      }

      const totalTime = Date.now() - startTime;
      console.log(`🎉 Processo completo em ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);

      return filteredData;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Erro após ${totalTime}ms:`, error);
      throw new Error('Erro ao capturar dados do Bitcoin');
    } finally {
      console.log('🔒 Fechando Chrome...');
      if (browser) await browser.close();
      console.log('✅ Chrome fechado');
    }
  }

  private async extractTableData(page: any): Promise<BitcoinData[]> {
    console.log('📋 Executando extração de dados da tabela...');

    const result = await page.evaluate(() => {
      const table = document.querySelector('table.yf-1jecxey.noDl.hideOnPrint');
      if (!table) throw new Error('Tabela não encontrada');

      const rows = table.querySelectorAll('tbody tr');
      console.log(`🔢 Encontradas ${rows.length} linhas na tabela`);

      const data: any[] = [];
      let validRows = 0;

      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const date = cells[0]?.textContent?.trim();
          const open = cells[1]?.textContent?.trim();
          const close = cells[4]?.textContent?.trim();

          if (date && open && close) {
            data.push({ date, open, close });
            validRows++;
          }
        }
      });

      console.log(`✅ Processadas ${validRows} linhas válidas de ${rows.length} total`);
      return data;
    });

    console.log(`📊 Extração concluída: ${result.length} registros extraídos`);
    return result;
  }

  private async fetchFearGreedData(): Promise<FearGreedData[]> {
    console.log('📡 Fazendo requisição para API Fear & Greed...');
    const apiStart = Date.now();

    try {
      const response: AxiosResponse<FearGreedApiResponse> =
        await firstValueFrom(
          this.httpService.get(
            'https://api.alternative.me/fng/?limit=0&format=json',
            { timeout: 30000 }, // Aumentado para t2.micro
          ),
        );

      const apiTime = Date.now() - apiStart;
      console.log(`✅ API Fear & Greed respondeu em ${apiTime}ms`);
      console.log(`📊 Recebidos ${response.data.data.length} registros da API`);

      const processedData = this.processFearGreedJson(response.data);
      console.log(`✅ Processados ${processedData.length} registros válidos`);

      return processedData;
    } catch (error) {
      const apiTime = Date.now() - apiStart;
      console.error(`❌ Erro na API Fear & Greed após ${apiTime}ms:`, error);
      throw new Error('Falha ao obter dados do Fear & Greed Index');
    }
  }

  private processFearGreedJson(
    apiResponse: FearGreedApiResponse,
  ): FearGreedData[] {
    if (apiResponse.metadata?.error) {
      throw new Error(`Erro da API: ${apiResponse.metadata.error}`);
    }

    return apiResponse.data
      .filter(
        (item) => item.value && item.value_classification && item.timestamp,
      )
      .map((item) => ({
        date: this.formatDate(new Date(parseInt(item.timestamp) * 1000)),
        value: parseInt(item.value),
        classification: item.value_classification.trim(),
      }))
      .filter(
        (item) => !isNaN(item.value) && item.value >= 0 && item.value <= 100,
      );
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private combineFearGreedData(
    bitcoinData: BitcoinDataWithMayer[],
    fearGreedData: FearGreedData[],
  ): BitcoinDataWithIndicators[] {
    console.log('🗺️ Criando mapa de dados Fear & Greed...');
    const fearGreedMap = new Map(fearGreedData.map((fg) => [fg.date, fg]));
    console.log(`✅ Mapa criado com ${fearGreedMap.size} entradas`);

    console.log('🔗 Combinando dados Bitcoin com Fear & Greed...');
    let matchedCount = 0;

    const result = bitcoinData.map((bitcoin) => {
      const fearGreed = fearGreedMap.get(bitcoin.date);
      if (fearGreed) matchedCount++;

      return {
        ...bitcoin,
        fearGreedValue: fearGreed?.value,
        fearGreedClassification: fearGreed?.classification,
      };
    });

    console.log(`✅ Combinação concluída: ${matchedCount} registros com Fear & Greed de ${bitcoinData.length} total`);
    return result;
  }

  private calculateMayerMultiple(data: BitcoinData[]): BitcoinDataWithMayer[] {
    console.log('📈 Ordenando dados por data...');
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    console.log(`✅ ${sortedData.length} registros ordenados`);

    console.log('🧮 Calculando médias móveis de 200 dias...');
    let calculatedCount = 0;

    const result = sortedData.map((item, index) => {
      const resultItem: BitcoinDataWithMayer = { ...item };

      if (index >= 199) {
        const last200Days = sortedData.slice(index - 199, index + 1);
        const movingAverage = this.calculateMovingAverage(last200Days);
        const closePrice = this.parsePrice(item.close);

        resultItem.movingAverage200 = movingAverage;
        if (closePrice && movingAverage) {
          resultItem.mayerMultiple = closePrice / movingAverage;
          calculatedCount++;
        }
      }

      return resultItem;
    });

    console.log(`✅ Mayer Multiple calculado para ${calculatedCount} registros`);
    return result;
  }

  private calculateMovingAverage(data: BitcoinData[]): number | undefined {
    if (data.length !== 200) return undefined;

    const prices = data
      .map((item) => this.parsePrice(item.close))
      .filter((price) => price !== null);

    return prices.length === 200
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : undefined;
  }

  private parsePrice(priceString: string): number | null {
    const price = parseFloat(priceString.replace(/,/g, ''));
    return isNaN(price) ? null : price;
  }

  private filterDataFrom2020(
    data: BitcoinDataWithIndicators[],
  ): BitcoinDataWithIndicators[] {
    const startDate = new Date('2020-01-01');
    return data.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && item.mayerMultiple !== undefined;
    });
  }

  private logResults(data: BitcoinDataWithIndicators[]): void {
    console.log(`\n📊 Total de registros: ${data.length}`);
    console.log('\nDATA\t\tCLOSE\t\tMAYER\tF&G\tSENTIMENTO');
    console.log('-----------------------------------------------------------');

    [...data.slice(0, 3), ...data.slice(-3)].forEach((item, index) => {
      if (index === 3) console.log('...');
      const mayer = item.mayerMultiple?.toFixed(3) || 'N/A';
      const fgValue = item.fearGreedValue || 'N/A';
      const fgClass = item.fearGreedClassification || 'N/A';
      console.log(
        `${item.date}\t${item.close}\t${mayer}\t${fgValue}\t${fgClass}`,
      );
    });

    const latest = data[data.length - 1];
    if (latest?.mayerMultiple && latest?.fearGreedValue) {
      const mayerStatus = this.getMayerStatus(latest.mayerMultiple);
      const fgEmoji = this.getFearGreedEmoji(latest.fearGreedValue);

      console.log('\n🎯 ANÁLISE ATUAL:');
      console.log(
        `📈 Mayer: ${latest.mayerMultiple.toFixed(3)} ${mayerStatus}`,
      );
      console.log(
        `${fgEmoji} F&G: ${latest.fearGreedValue} - ${latest.fearGreedClassification}`,
      );
      console.log(
        `💡 ${this.getRecommendation(latest.mayerMultiple, latest.fearGreedValue)}`,
      );
    }
  }

  private getMayerStatus(mayer: number): string {
    if (mayer < 1.0) return '🟢 SUBVALORIZADO';
    if (mayer <= 2.4) return '🟡 NEUTRO';
    return '🔴 SUPERVALORIZADO';
  }

  private getFearGreedEmoji(value: number): string {
    if (value <= 24) return '😨';
    if (value <= 49) return '😟';
    if (value <= 74) return '😊';
    return '🤑';
  }

  private getRecommendation(mayer: number, fearGreed: number): string {
    const isLowMayer = mayer < 1.0;
    const isHighMayer = mayer > 2.4;
    const isExtremeFear = fearGreed <= 24;
    const isExtremeGreed = fearGreed >= 75;

    if (isLowMayer && isExtremeFear)
      return 'COMPRA FORTE: Oportunidade excepcional!';
    if (isHighMayer && isExtremeGreed) return 'CAUTELA MÁXIMA: Risco elevado!';
    if (isLowMayer || isExtremeFear)
      return 'COMPRA MODERADA: Indicador favorável';
    if (isHighMayer || isExtremeGreed) return 'CAUTELA: Indicador desfavorável';
    return 'NEUTRO: Aguardar sinais mais claros';
  }
}
