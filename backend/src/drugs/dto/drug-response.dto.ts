export interface DrugResponseDto {
  // Basic drug info
  id: number;
  drugId: string;
  ndc?: string;
  brandName?: string;
  genericName?: string;
  manufacturer?: string;
  dataSource: string;

  // SEO metadata
  title?: string;
  metaDescription?: string;
  slug?: string;
  canonicalUrl?: string;
  structuredData?: any;
  keywords?: string[];

  // Enhanced content
  summary?: string;
  indicationSummary?: string;
  sideEffectsSummary?: string;
  dosageSummary?: string;
  warningsSummary?: string;
  contraindicationsSummary?: string;

  // Interactive content
  aiGeneratedFaqs?: Array<{ question: string; answer: string }>;
  relatedDrugs?: string[];
  relatedConditions?: string[];

  // Raw extracted data (for fallback display)
  indications?: string[];
  contraindications?: string[];
  warnings?: string[];
  dosage?: string[];
  activeIngredients?: string[];
  inactiveIngredients?: string[];

  // Metadata
  isEnriched: boolean;
  isReviewed: boolean;
  isPublished: boolean;
  confidenceScore?: number;
  lastUpdated: Date;
  createdAt: Date;
}

export interface DrugListResponseDto {
  drugs: Array<
    Pick<
      DrugResponseDto,
      'id' | 'drugId' | 'ndc' | 'brandName' | 'genericName' | 'manufacturer' | 'slug' | 'isEnriched'
    >
  >;
  total: number;
  page: number;
  limit: number;
}
