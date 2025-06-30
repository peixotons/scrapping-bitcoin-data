export class BitcoinDataDto {
  date: string;
  open: string;
  close: string;
  movingAverage200?: number;
  mayerMultiple?: number;
  fearGreedValue?: number;
  fearGreedClassification?: string;
}

export class CurrentAnalysisDto {
  price: number;
  mayerMultiple: number;
  mayerStatus: string;
  fearGreedValue: number;
  fearGreedStatus: string;
  recommendation: string;
  confidenceLevel: string;
}

export class MetadataDto {
  totalRecords: number;
  dataRange: string;
  lastUpdate: string;
}

export class BitcoinAnalysisResponseDto {
  success: boolean;
  meta: MetadataDto;
  data: BitcoinDataDto[];
  currentAnalysis: CurrentAnalysisDto;
}
