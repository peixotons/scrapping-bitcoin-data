import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

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

  constructor(private readonly httpService: HttpService) { }

  async scrapeBitcoinData(): Promise<BitcoinDataWithIndicators[]> {
    console.log('🚀 Iniciando captura de dados do Bitcoin...');

    // Verificar cache
    const cacheKey = 'bitcoin-data';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 Retornando dados do cache (10min TTL)');
      return cached.data;
    }

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        // Básicos para Docker
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',

        // Otimizações para t2.micro (low memory/CPU)
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-preconnect-resource-hints',
        '--disable-loading-animation',
        '--disable-web-security',
        '--aggressive-cache-discard',
        '--memory-pressure-off',

        // Limites de recursos
        '--max_old_space_size=256',
        '--max-heap-size=256',
        '--single-process', // CRÍTICO para t2.micro

        // Rede otimizada
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    try {
      const page = await browser.newPage();

      // Otimizações de página para t2.micro
      await page.setViewport({ width: 1024, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Desabilitar recursos desnecessários
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      console.log('📊 Navegando para Yahoo Finance...');
      await page.goto(
        'https://finance.yahoo.com/quote/BTC-USD/history/?guce_referrer=aHR0cHM6Ly9jaGF0Z3B0LmNvbS8&guce_referrer_sig=AQAAAGC1TQxq2tHtAaEFZelG6GyHbXkLr5o71-Ufy2nkU4z3SCZDAjI6THEwud8rlVm3Q-w-xLk0C_R_kG5yLhp0gXpypvMI8ORpvc_Qk8ju3xajj327Vz9wUMHI9Z2DSdEye9TunuCOCk2S2wpMc3j6J11IP8VRLqMCVCwFQEwfRdy2&period1=1514764800&period2=1751289979',
        { waitUntil: 'domcontentloaded', timeout: 60000 } // Aumentado para t2.micro
      );

      console.log('⏳ Aguardando tabela carregar...');
      await page.waitForSelector('table.yf-1jecxey.noDl.hideOnPrint', {
        timeout: 45000, // Aumentado para t2.micro
      });

      const bitcoinData = await this.extractTableData(page);
      const fearGreedData = await this.fetchFearGreedData();
      const dataWithMayer = this.calculateMayerMultiple(bitcoinData);
      const dataWithIndicators = this.combineFearGreedData(
        dataWithMayer,
        fearGreedData,
      );
      const filteredData = this.filterDataFrom2020(dataWithIndicators);

      this.logResults(filteredData);

      // Salvar no cache
      this.cache.set(cacheKey, { data: filteredData, timestamp: Date.now() });
      console.log('💾 Dados salvos no cache');

      return filteredData;
    } catch (error) {
      console.error('Erro ao capturar dados:', error);
      throw new Error('Erro ao capturar dados do Bitcoin');
    } finally {
      if (browser) await browser.close();
    }
  }

  private async extractTableData(page: any): Promise<BitcoinData[]> {
    console.log('Extraindo dados da tabela...');

    return await page.evaluate(() => {
      const table = document.querySelector('table.yf-1jecxey.noDl.hideOnPrint');
      if (!table) throw new Error('Tabela não encontrada');

      const rows = table.querySelectorAll('tbody tr');
      const data: BitcoinData[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const date = cells[0]?.textContent?.trim();
          const open = cells[1]?.textContent?.trim();
          const close = cells[4]?.textContent?.trim();

          if (date && open && close) {
            data.push({ date, open, close });
          }
        }
      });

      return data;
    });
  }

  private async fetchFearGreedData(): Promise<FearGreedData[]> {
    console.log('Buscando Fear & Greed Index...');

    try {
      const response: AxiosResponse<FearGreedApiResponse> =
        await firstValueFrom(
          this.httpService.get(
            'https://api.alternative.me/fng/?limit=0&format=json',
            { timeout: 30000 }, // Aumentado para t2.micro
          ),
        );

      return this.processFearGreedJson(response.data);
    } catch (error) {
      console.error('Erro ao buscar Fear & Greed:', error);
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
    const fearGreedMap = new Map(fearGreedData.map((fg) => [fg.date, fg]));

    return bitcoinData.map((bitcoin) => {
      const fearGreed = fearGreedMap.get(bitcoin.date);
      return {
        ...bitcoin,
        fearGreedValue: fearGreed?.value,
        fearGreedClassification: fearGreed?.classification,
      };
    });
  }

  private calculateMayerMultiple(data: BitcoinData[]): BitcoinDataWithMayer[] {
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return sortedData.map((item, index) => {
      const result: BitcoinDataWithMayer = { ...item };

      if (index >= 199) {
        const last200Days = sortedData.slice(index - 199, index + 1);
        const movingAverage = this.calculateMovingAverage(last200Days);
        const closePrice = this.parsePrice(item.close);

        result.movingAverage200 = movingAverage;
        if (closePrice && movingAverage) {
          result.mayerMultiple = closePrice / movingAverage;
        }
      }

      return result;
    });
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
