import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Drug } from './drug.entity';

@Entity('drug_enrichments')
export class DrugEnrichment {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Drug, (drug) => drug.enrichment)
  @JoinColumn({ name: 'drug_id' })
  drug: Drug;

  // SEO fields
  @Column({ length: 200, nullable: true })
  title?: string;

  @Column('text', { nullable: true })
  metaDescription?: string;

  @Column({ length: 200, unique: true, nullable: true })
  slug?: string;

  @Column({ length: 500, nullable: true })
  canonicalUrl?: string;

  @Column('jsonb', { nullable: true })
  structuredData?: any; // Schema.org markup

  // Human-readable content
  @Column('text', { nullable: true })
  summary?: string;

  @Column('text', { nullable: true })
  indicationSummary?: string;

  @Column('text', { nullable: true })
  sideEffectsSummary?: string;

  @Column('text', { nullable: true })
  dosageSummary?: string;

  @Column('text', { nullable: true })
  warningsSummary?: string;

  @Column('text', { nullable: true })
  contraindicationsSummary?: string;

  // Enhanced content sections
  @Column('jsonb', { nullable: true })
  aiGeneratedFaqs?: Array<{ question: string; answer: string }>;

  @Column('text', { array: true, nullable: true })
  relatedDrugs?: string[];

  @Column('text', { array: true, nullable: true })
  relatedConditions?: string[];

  @Column('text', { array: true, nullable: true })
  keywords?: string[]; // SEO keywords

  // Content quality metrics
  @Column({ length: 50, nullable: true })
  aiModelVersion?: string;

  @Column({ length: 20, nullable: true })
  promptVersion?: string;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  confidenceScore?: number;

  @Column('text', { nullable: true })
  contentHash?: string; // For change detection

  // Content flags
  @Column({ default: false })
  isReviewed: boolean;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true })
  reviewedBy?: string;

  @Column({ nullable: true })
  reviewedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
