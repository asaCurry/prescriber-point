import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('drugs')
export class Drug {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  genericName: string;

  @Column()
  manufacturer: string;

  @Column('text', { array: true, nullable: true })
  indications: string[];

  @Column('text', { array: true, nullable: true })
  contraindications: string[];

  @Column('text', { nullable: true })
  dosing: string;

  @Column('text', { array: true, nullable: true })
  warnings: string[];

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  aiGeneratedTitle: string;

  @Column('text', { nullable: true })
  aiGeneratedMetaDescription: string;

  @Column('text', { nullable: true })
  aiGeneratedContent: string;

  @Column('jsonb', { nullable: true })
  aiGeneratedFaqs: any;

  @Column('text', { array: true, nullable: true })
  relatedDrugs: string[];

  @Column('jsonb', { nullable: true })
  originalLabelData: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}