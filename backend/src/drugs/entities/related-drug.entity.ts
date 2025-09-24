import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Drug } from './drug.entity';

@Entity('related_drugs')
export class RelatedDrug {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Drug, (drug) => drug.relatedDrugs)
  @JoinColumn({ name: 'source_drug_id' })
  sourceDrug: Drug;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 20, nullable: true })
  ndc?: string;

  @Column({ length: 200, nullable: true })
  brandName?: string;

  @Column({ length: 200, nullable: true })
  genericName?: string;

  @Column({ length: 200, nullable: true })
  manufacturer?: string;

  @Column('text', { nullable: true })
  indication?: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  confidenceScore?: number;

  @Column({ length: 50, nullable: true })
  relationshipType?: string; // e.g., 'similar_indication', 'same_class', 'alternative'

  @Column('jsonb', { nullable: true })
  metadata?: any; // Additional metadata about the relationship

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
