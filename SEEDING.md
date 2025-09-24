# Database Seeding with MCP Enrichment (Advanced/Automated)

⚠️ **ADVANCED SEEDER FUNCTIONALITY CURRENTLY DISABLED** ⚠️

This document explains the **advanced, automated** seeding system for PrescriberPoint database with drug data and MCP enrichment flow.

**Note**: This advanced seeder functionality is currently commented out to focus on core features.

## 🚀 **For Current Active Seeding, Use:**

👉 **See [SIMPLE-SEEDING.md](./SIMPLE-SEEDING.md)** for the **active, working** seeding system with built-in API key handling.

## 📋 **This Document Covers:**

The **production-ready, automated** seeding system that includes:

- Docker Compose integration
- Automated service health checks
- Production deployment scripts
- Comprehensive monitoring and logging

## Overview

The seeding process:

1. Loads drug data from `seed-data.json`
2. Creates drug records in the database
3. Triggers MCP enrichment automatically
4. Waits for enrichment to complete
5. Verifies the seeding results

## Files

- `seed-database.ts` - Main seeding script (TypeScript)
- `seed-database.sh` - Docker integration script (Bash)
- `seed-data.json` - Drug data file (generated from FDA API)

## Prerequisites

1. **Database**: PostgreSQL must be running and accessible
2. **Backend**: NestJS backend must be running and healthy
3. **MCP Services**: AI/MCP services must be available
4. **Seed Data**: `seed-data.json` file must exist in the project root

## Usage

### Development (Local)

```bash
# 1. Start the database and backend services
docker-compose up postgres backend -d

# 2. Wait for services to be ready (about 30-60 seconds)
sleep 60

# 3. Run the seeding script
cd backend
npm run seed
```

### Production (Docker)

```bash
# Using the shell script approach
docker-compose up db-seeder

# Or using direct npm command
docker-compose up db-seeder-direct
```

### Manual Execution

```bash
# Development
cd backend
npm run seed

# Production (after building)
cd backend
npm run build
npm run seed:prod
```

## Docker Compose Integration

Add one of these services to your `docker-compose.yml`:

### Option 1: Shell Script Approach

```yaml
db-seeder:
  build:
    context: ./backend
    dockerfile: Dockerfile
  depends_on:
    postgres:
      condition: service_healthy
    backend:
      condition: service_started
  environment:
    - NODE_ENV=development
    - DATABASE_HOST=postgres
    - DATABASE_PORT=5432
    - DATABASE_USER=postgres
    - DATABASE_PASSWORD=postgres
    - DATABASE_NAME=prescriber_point
  volumes:
    - ./seed-data.json:/app/seed-data.json:ro
    - ./seed-database.sh:/app/seed-database.sh:ro
  command: ["/app/seed-database.sh"]
  restart: "no"
```

### Option 2: Direct NPM Approach

```yaml
db-seeder-direct:
  build:
    context: ./backend
    dockerfile: Dockerfile
  depends_on:
    postgres:
      condition: service_healthy
    backend:
      condition: service_started
  environment:
    - NODE_ENV=development
    - DATABASE_HOST=postgres
    - DATABASE_PORT=5432
    - DATABASE_USER=postgres
    - DATABASE_PASSWORD=postgres
    - DATABASE_NAME=prescriber_point
  volumes:
    - ./seed-data.json:/app/seed-data.json:ro
  command: ["npm", "run", "seed"]
  restart: "no"
```

## Environment Variables

| Variable            | Description                   | Default            |
| ------------------- | ----------------------------- | ------------------ |
| `DATABASE_HOST`     | Database host                 | `postgres`         |
| `DATABASE_PORT`     | Database port                 | `5432`             |
| `DATABASE_USER`     | Database username             | `postgres`         |
| `DATABASE_PASSWORD` | Database password             | `postgres`         |
| `DATABASE_NAME`     | Database name                 | `prescriber_point` |
| `NODE_ENV`          | Environment mode              | `development`      |
| `RUN_MIGRATIONS`    | Run migrations before seeding | `false`            |
| `VERIFY_SEEDING`    | Verify seeding results        | `false`            |

## Timing Considerations

### Critical Timing Points

1. **Database Readiness**: PostgreSQL must be fully initialized
2. **Backend Readiness**: NestJS app must be started and healthy
3. **MCP Services**: AI services must be available for enrichment
4. **Enrichment Processing**: Allow time for MCP enrichment to complete

### Recommended Delays

- **Service Startup**: 30-60 seconds after docker-compose up
- **Between Drugs**: 2 seconds (built into script)
- **MCP Enrichment**: 5 seconds per drug + 30 seconds final wait
- **Total Process**: ~3-5 minutes for 10 drugs

## MCP Enrichment Flow

The seeding process automatically triggers MCP enrichment:

1. **Drug Creation**: `DrugsService.create()` is called
2. **Automatic Enrichment**: `triggerEnrichmentViaMCP()` is called
3. **AI Processing**: MCP services enrich the drug data
4. **Database Updates**: Enriched data is saved to `DrugEnrichment` table
5. **Related Drugs**: Related drugs are generated and saved

## Verification

The script includes verification steps:

- ✅ Database connection test
- ✅ Drug creation confirmation
- ✅ Enrichment data verification
- ✅ Related drugs verification

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Check if PostgreSQL is running
   - Verify connection parameters
   - Ensure database exists

2. **Backend Not Ready**

   - Wait longer for backend startup
   - Check backend logs for errors
   - Verify all dependencies are installed

3. **MCP Enrichment Failed**

   - Check AI service logs
   - Verify MCP configuration
   - Ensure API keys are set

4. **Seed Data Not Found**
   - Verify `seed-data.json` exists in project root
   - Check file permissions
   - Ensure correct path in Docker volumes

### Debugging

```bash
# Check database connection
docker-compose exec postgres pg_isready -U postgres

# Check backend health
curl http://localhost:3000/health

# View seeding logs
docker-compose logs db-seeder

# Check database contents
docker-compose exec postgres psql -U postgres -d prescriber_point -c "SELECT COUNT(*) FROM drug;"
```

## Monitoring

Monitor the seeding process:

```bash
# Watch seeding logs
docker-compose logs -f db-seeder

# Monitor database
docker-compose exec postgres psql -U postgres -d prescriber_point -c "SELECT brand_name, created_at FROM drug ORDER BY created_at DESC LIMIT 10;"

# Check enrichment status
docker-compose exec postgres psql -U postgres -d prescriber_point -c "SELECT d.brand_name, de.title IS NOT NULL as enriched FROM drug d LEFT JOIN drug_enrichment de ON d.id = de.drug_id;"
```

## Production Considerations

1. **Resource Limits**: Set appropriate memory/CPU limits
2. **Timeout Handling**: Increase timeouts for slower systems
3. **Error Handling**: Implement retry logic for failed drugs
4. **Monitoring**: Add comprehensive logging and monitoring
5. **Backup**: Backup database before seeding
6. **Rollback**: Have rollback procedures ready

## Security

- Use environment variables for sensitive data
- Limit database permissions for seeding user
- Validate seed data before processing
- Implement rate limiting for API calls
- Monitor for unusual activity

## Performance

- Monitor database performance during seeding
- Use connection pooling for large datasets
- Implement batch processing for efficiency
- Consider database indexing for faster queries
- Monitor memory usage and optimize as needed

## 🎯 **When to Use Each Seeding Approach**

### **Use SIMPLE-SEEDING.md (Current Active System)**

- ✅ **Development and testing**
- ✅ **Quick database setup**
- ✅ **Manual control over seeding process**
- ✅ **Built-in API key handling**
- ✅ **Interactive prompts and guidance**

### **Use This Advanced System (SEEDING.md)**

- 🏭 **Production deployments**
- 🤖 **Fully automated CI/CD pipelines**
- 📊 **Large-scale database initialization**
- 🔄 **Automated service orchestration**
- 📈 **Comprehensive monitoring and logging**

## 🔄 **Migration Path**

When ready to enable the advanced system:

1. **Uncomment** the relevant code in:

   - `backend/seed-database.ts`
   - `seed-database.sh`
   - `docker-compose-seeder-example.yml`

2. **Update** `backend/package.json` to restore the `seed` and `seed:prod` scripts

3. **Test** the advanced system in a development environment

4. **Deploy** to production with proper monitoring
