# Simple Database Seeding

A streamlined approach to seed the database with 5 popular drugs and trigger MCP enrichment.

## Features

- **Built-in API Key Handling**: Automatically detects and provides guidance for setting the `ANTHROPIC_API_KEY`
- **Interactive Mode**: Optionally prompts for API key input during execution
- **Comprehensive Help**: Built-in help system with usage instructions
- **Smart Duplicate Detection**: Skips drugs that already exist in the database
- **Progress Tracking**: Real-time logging of seeding progress
- **Verification**: Automatic verification of seeding results

## Quick Start

### Prerequisites

1. Database and backend services must be running
2. `seed-data.json` file exists in project root (5 drugs included)
3. **API Key** (Optional but Recommended): Get your API key from [Anthropic Console](https://console.anthropic.com/)

### Run Seeding

#### Basic Usage

```bash
# Run seeder with API key guidance
docker-compose exec backend npm run seed:simple
```

#### Interactive Mode

```bash
# Run seeder with interactive API key prompt
docker-compose exec backend npm run seed:interactive
```

#### Help

```bash
# Show help and usage information
docker-compose exec backend npm run seed:simple -- --help
```

## API Key Configuration

The seeder automatically handles API key configuration in multiple ways:

### Option 1: Environment Variable (Recommended)

```bash
export ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
docker-compose exec backend npm run seed:simple
```

### Option 2: Inline with Command

```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here docker-compose exec backend npm run seed:simple
```

### Option 3: Interactive Prompt

```bash
docker-compose exec backend npm run seed:interactive
# Follow the prompts to enter your API key
```

### Option 4: .env File

```bash
echo "ANTHROPIC_API_KEY=sk-ant-your-actual-key-here" > .env
docker-compose exec backend npm run seed:simple
```

### What It Does

1. **Initialization**: The seeder initializes the NestJS application context
2. **API Key Check**: Detects and provides guidance for API key configuration
3. **Data Loading**: Loads drug data from `seed-data.json`
4. **Drug Creation**: Creates each drug in the database via `DrugsService.create()`
5. **MCP Enrichment**: Triggers the MCP enrichment flow for AI content generation
6. **Verification**: Verifies the seeding results and provides statistics

### Expected Output

```
🚀 Initializing simple seeder...
✅ ANTHROPIC_API_KEY found - AI enrichment enabled
📄 Loaded 5 drugs from seed data
🌱 Starting to seed 5 drugs...
💊 Seeding: Lipitor (NDC: 58151-155)
✅ Drug Lipitor created successfully
🤖 MCP enrichment will process Lipitor in the background...
💊 Seeding: Metformin Hydrochloride (NDC: 50090-7011)
✅ Drug Metformin Hydrochloride created successfully
🤖 MCP enrichment will process Metformin Hydrochloride in the background...
...
🎉 Seeding completed: 5 successful, 0 failed
📊 Verification: Found 18 drugs in database
🎯 Found 12 drugs with enrichment data
🔗 Found 3 drugs with related drugs
🎉 Database seeding completed successfully!
💡 Note: MCP enrichment happens in the background and may take a few minutes to complete.
```

## Included Drugs

1. **Lipitor** (Atorvastatin) - Cholesterol medication
2. **Metformin Hydrochloride** - Diabetes medication
3. **Lisinopril and Hydrochlorothiazide** - Blood pressure medication
4. **Levothyroxine sodium** - Thyroid medication
5. **Amlodipine Besylate** - Blood pressure medication

## MCP Enrichment Flow

- **Automatic**: Triggered when drugs are created
- **Background**: Runs asynchronously
- **Includes**: AI-generated summaries, related drugs, enhanced metadata
- **Timing**: May take 2-5 minutes to complete for all 5 drugs

## Monitoring Enrichment

Check enrichment progress:

```bash
# Check database for enriched drugs
docker-compose exec postgres psql -U postgres -d prescriber_point -c "SELECT d.brand_name, de.title IS NOT NULL as enriched FROM drug d LEFT JOIN drug_enrichment de ON d.id = de.drug_id;"

# Check related drugs
docker-compose exec postgres psql -U postgres -d prescriber_point -c "SELECT COUNT(*) as related_drugs FROM related_drug;"
```

## Troubleshooting

### API Key Not Found

If you see API key guidance messages, follow the provided instructions to set your `ANTHROPIC_API_KEY`.

### Seed Data File Not Found

```bash
# Copy the seed data file into the container
docker cp seed-data.json prescriber-point-backend-1:/app/seed-data.json
```

### Database Connection Issues

Ensure the postgres service is running and healthy:

```bash
docker-compose ps postgres
```

### Services Not Ready

Wait for services to be fully initialized:

```bash
# Check service status
docker-compose ps

# Wait and retry
sleep 30
docker-compose exec backend npm run seed:simple
```

### Reset Database

```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm prescriber-point_postgres_data

# Restart services
docker-compose up -d postgres backend

# Wait for services to be ready, then seed
sleep 30
docker cp seed-data.json prescriber-point-backend-1:/app/seed-data.json
docker-compose exec backend npm run seed:simple
```

## Advanced Usage

### Command Line Options

- `--interactive` or `-i`: Enable interactive API key prompting
- `--help` or `-h`: Show help information

### Environment Variables

- `ANTHROPIC_API_KEY`: Anthropic API key for AI enrichment features
- `NODE_ENV`: Node environment (automatically set by Docker)

## Files

- `simple-seed.ts` - Main seeding script with built-in API key handling
- `seed-data.json` - 5 drug records (reduced from 10)
- `package.json` - Contains `seed:simple` and `seed:interactive` scripts

## Next Steps

After seeding:

1. Check the frontend to see the drugs
2. Monitor MCP enrichment progress
3. Test drug search and related drugs functionality
4. Verify AI-generated content appears

## Notes

- The seeder automatically skips drugs that already exist in the database
- MCP enrichment happens asynchronously in the background
- The process includes built-in delays to ensure proper service initialization
- All operations are logged for debugging and monitoring purposes
- API key guidance is provided automatically when not detected
