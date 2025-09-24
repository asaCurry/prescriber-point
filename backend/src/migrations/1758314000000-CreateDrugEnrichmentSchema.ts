import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDrugEnrichmentSchema1758314000000 implements MigrationInterface {
  name = 'CreateDrugEnrichmentSchema1758314000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing drugs table if it exists (for clean migration)
    await queryRunner.query(`DROP TABLE IF EXISTS "drugs" CASCADE`);

    // Create new drugs table for raw data
    await queryRunner.query(`
      CREATE TABLE "drugs" (
        "id" SERIAL NOT NULL,
        "drugId" character varying NOT NULL,
        "fdaData" jsonb NOT NULL,
        "dataSource" character varying NOT NULL,
        "dataVersion" character varying,
        "ndc" character varying,
        "brandName" character varying,
        "genericName" character varying,
        "manufacturer" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_drugs_drugId" UNIQUE ("drugId"),
        CONSTRAINT "PK_drugs_id" PRIMARY KEY ("id")
      )
    `);

    // Create drug_enrichments table
    await queryRunner.query(`
      CREATE TABLE "drug_enrichments" (
        "id" SERIAL NOT NULL,
        "drug_id" integer NOT NULL,
        "title" character varying(200),
        "metaDescription" text,
        "slug" character varying(200),
        "canonicalUrl" character varying(500),
        "structuredData" jsonb,
        "summary" text,
        "indicationSummary" text,
        "sideEffectsSummary" text,
        "dosageSummary" text,
        "warningsSummary" text,
        "contraindicationsSummary" text,
        "aiGeneratedFaqs" jsonb,
        "relatedDrugs" text array,
        "relatedConditions" text array,
        "keywords" text array,
        "aiModelVersion" character varying(50),
        "promptVersion" character varying(20),
        "confidenceScore" numeric(3,2),
        "contentHash" text,
        "isReviewed" boolean NOT NULL DEFAULT false,
        "isPublished" boolean NOT NULL DEFAULT false,
        "reviewedBy" character varying,
        "reviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_drug_enrichments_slug" UNIQUE ("slug"),
        CONSTRAINT "UQ_drug_enrichments_drug_id" UNIQUE ("drug_id"),
        CONSTRAINT "PK_drug_enrichments_id" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "drug_enrichments" 
      ADD CONSTRAINT "FK_drug_enrichments_drug_id" 
      FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE CASCADE
    `);

    // Add indexes for performance
    await queryRunner.query(`CREATE INDEX "IDX_drugs_ndc" ON "drugs" ("ndc")`);
    await queryRunner.query(`CREATE INDEX "IDX_drugs_brandName" ON "drugs" ("brandName")`);
    await queryRunner.query(`CREATE INDEX "IDX_drugs_dataSource" ON "drugs" ("dataSource")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_drug_enrichments_slug" ON "drug_enrichments" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drug_enrichments_isPublished" ON "drug_enrichments" ("isPublished")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "drug_enrichments"`);
    await queryRunner.query(`DROP TABLE "drugs"`);
  }
}
