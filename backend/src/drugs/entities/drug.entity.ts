import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { DrugEnrichment } from './drug-enrichment.entity';
import { RelatedDrug } from './related-drug.entity';

@Entity('drugs')
export class Drug {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200, nullable: true })
  brandName?: string;

  @Column({ length: 200, nullable: true })
  genericName?: string;

  @Column({ length: 200, nullable: true })
  manufacturer?: string;

  @Column({ length: 20, unique: true, nullable: true })
  ndc?: string;

  @Column('text', { nullable: true })
  indications?: string;

  @Column('text', { nullable: true })
  warnings?: string;

  @Column('text', { nullable: true })
  dosage?: string;

  @Column('text', { nullable: true })
  contraindications?: string;

  @Column('jsonb', { nullable: true })
  fdaData?: any;

  @Column({ length: 200, nullable: true })
  dataSource?: string;

  @OneToOne(() => DrugEnrichment, (enrichment) => enrichment.drug)
  enrichment?: DrugEnrichment;

  @OneToMany(() => RelatedDrug, (relatedDrug) => relatedDrug.sourceDrug)
  relatedDrugs?: RelatedDrug[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
