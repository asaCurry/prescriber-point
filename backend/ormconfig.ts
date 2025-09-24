import { DataSource } from 'typeorm';
import { Drug } from './src/drugs/entities/drug.entity';
import { DrugEnrichment } from './src/drugs/entities/drug-enrichment.entity';
import { RelatedDrug } from './src/drugs/entities/related-drug.entity';
import { CreateDrugEnrichmentSchema1758314000000 } from './src/migrations/1758314000000-CreateDrugEnrichmentSchema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'prescriber_point',
  entities: [Drug, DrugEnrichment, RelatedDrug],
  migrations: [CreateDrugEnrichmentSchema1758314000000],
  synchronize: false,
  logging: true,
});
