import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRelatedDrugsTable1758315000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'related_drugs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'source_drug_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'ndc',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'brandName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'genericName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'indication',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confidenceScore',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'relationshipType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['source_drug_id'],
            referencedTableName: 'drugs',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_RELATED_DRUGS_SOURCE_DRUG_ID',
            columnNames: ['source_drug_id'],
          },
          {
            name: 'IDX_RELATED_DRUGS_NDC',
            columnNames: ['ndc'],
          },
          {
            name: 'IDX_RELATED_DRUGS_NAME',
            columnNames: ['name'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('related_drugs');
  }
}
