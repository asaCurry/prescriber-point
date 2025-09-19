# PrescriberPoint - AI-Enhanced Drug Information Platform

A full-stack application that processes FDA drug labels and creates SEO-optimized content pages using AI enhancement. Built with Next.js frontend, NestJS backend, Python AI microservice, and PostgreSQL database.

## Architecture

- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS
- **Backend**: NestJS with TypeScript and TypeORM
- **AI Service**: FastAPI Python microservice with OpenAI integration
- **Database**: PostgreSQL 15
- **Deployment**: Docker containers with docker-compose

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd prescriber-point
   cp .env.example .env
   ```

2. **Configure environment**:
   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

3. **Start the application**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api
   - AI Service: http://localhost:8000
   - Database: localhost:5432

## Services

### Frontend (Next.js)
- Server-side rendered drug information pages
- SEO-optimized with meta tags and structured data
- Responsive design for healthcare professionals
- Search and filtering functionality

### Backend (NestJS)
- RESTful API for drug data management
- TypeORM integration with PostgreSQL
- OpenAPI/Swagger documentation
- Validation and error handling

### AI Service (Python)
- FastAPI-based microservice
- Claude AI integration for content enhancement
- Generates SEO titles, meta descriptions, and enhanced content
- Creates FAQ sections and related drug suggestions

### Database (PostgreSQL)
- Stores processed drug data
- AI-generated content caching
- Full-text search capabilities

## Development

### Running Services Individually

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

**Backend**:
```bash
cd backend
npm install
npm run start:dev
```

**AI Service**:
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

### Database Management

The application uses TypeORM with auto-synchronization enabled for development. The database schema will be automatically created when the backend starts.

### API Documentation

Once the backend is running, visit http://localhost:3001/api for interactive API documentation.

## Production Considerations

- Set `synchronize: false` in TypeORM configuration
- Use database migrations for schema changes
- Implement proper error handling and logging
- Add rate limiting for AI service calls
- Configure environment-specific settings
- Use production-grade Anthropic API keys with appropriate limits

## Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## Contributing

1. Follow the existing code style and conventions
2. Add tests for new functionality
3. Update documentation as needed
4. Use conventional commit messages