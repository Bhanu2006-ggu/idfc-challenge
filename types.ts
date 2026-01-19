
export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface CorrectionHistory {
  oldValue: any;
  newValue: any;
  timestamp: string;
  user: string;
}

export interface ExtractedField<T> {
  value: T;
  confidence: number;
  boundingBox?: BoundingBox;
  isEdited?: boolean;
  history?: CorrectionHistory[];
}

export interface DocumentRelation {
  id: string;
  sourceField: string;
  targetDocId: string;
  targetField: string;
  targetValue: any;
  targetDocName: string;
}

export interface InvoiceData {
  documentType: ExtractedField<string>;
  dealerName: ExtractedField<string>;
  modelName: ExtractedField<string>;
  horsePower: ExtractedField<number>;
  assetCost: ExtractedField<number>;
  dealerSignature: ExtractedField<boolean>;
  dealerStamp: ExtractedField<boolean>;
}

export interface StoredDocument {
  id: string;
  timestamp: string;
  image: string;
  data: InvoiceData;
  metrics: ProcessingMetrics;
  relations?: DocumentRelation[];
}

export interface ProcessingMetrics {
  latencyMs: number;
  costEstimateUsd: number;
  documentAccuracy: number;
}

export enum AppTab {
  PROCESSOR = 'processor',
  GENERATOR = 'generator',
  HISTORY = 'history',
  INSIGHTS = 'insights',
  ARCHITECTURE = 'architecture'
}
