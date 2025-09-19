from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import anthropic
import json
import logging

load_dotenv()

app = FastAPI(title="PrescriberPoint AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

claude_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DrugLabelData(BaseModel):
    name: str
    generic_name: Optional[str] = None
    manufacturer: str
    indications: Optional[List[str]] = None
    contraindications: Optional[List[str]] = None
    dosing: Optional[str] = None
    warnings: Optional[List[str]] = None
    description: Optional[str] = None

class AIEnhancementRequest(BaseModel):
    drug_data: DrugLabelData
    enhancement_type: str  # 'title', 'meta_description', 'content', 'faq', 'related'

class AIEnhancementResponse(BaseModel):
    enhanced_content: Dict[str, Any]
    success: bool
    error_message: Optional[str] = None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

@app.post("/enhance", response_model=AIEnhancementResponse)
async def enhance_drug_content(request: AIEnhancementRequest):
    try:
        drug = request.drug_data
        enhancement_type = request.enhancement_type
        
        if enhancement_type == "title":
            enhanced_content = await generate_seo_title(drug)
        elif enhancement_type == "meta_description":
            enhanced_content = await generate_meta_description(drug)
        elif enhancement_type == "content":
            enhanced_content = await generate_enhanced_content(drug)
        elif enhancement_type == "faq":
            enhanced_content = await generate_faq(drug)
        elif enhancement_type == "related":
            enhanced_content = await generate_related_suggestions(drug)
        else:
            raise HTTPException(status_code=400, detail="Invalid enhancement type")
        
        return AIEnhancementResponse(
            enhanced_content=enhanced_content,
            success=True
        )
    except Exception as e:
        logger.error(f"Error enhancing content: {str(e)}")
        return AIEnhancementResponse(
            enhanced_content={},
            success=False,
            error_message=str(e)
        )

async def generate_seo_title(drug: DrugLabelData) -> Dict[str, str]:
    prompt = f"""
    Generate an SEO-optimized title for a drug information page.
    
    Drug: {drug.name}
    Generic Name: {drug.generic_name or 'N/A'}
    Indications: {', '.join(drug.indications) if drug.indications else 'N/A'}
    
    Requirements:
    - Maximum 60 characters
    - Include drug name and primary use
    - Professional tone for healthcare providers
    - SEO-friendly
    
    Return only the title, no explanation.
    """
    
    response = await call_claude(prompt)
    return {"title": response.strip()}

async def generate_meta_description(drug: DrugLabelData) -> Dict[str, str]:
    prompt = f"""
    Generate an SEO-optimized meta description for a drug information page.
    
    Drug: {drug.name}
    Generic Name: {drug.generic_name or 'N/A'}
    Indications: {', '.join(drug.indications) if drug.indications else 'N/A'}
    Manufacturer: {drug.manufacturer}
    
    Requirements:
    - Maximum 160 characters
    - Include key drug information
    - Professional tone for healthcare providers
    - Action-oriented for search results
    
    Return only the meta description, no explanation.
    """
    
    response = await call_claude(prompt)
    return {"meta_description": response.strip()}

async def generate_enhanced_content(drug: DrugLabelData) -> Dict[str, str]:
    prompt = f"""
    Generate enhanced, provider-friendly content for a drug information page.
    
    Drug: {drug.name}
    Generic Name: {drug.generic_name or 'N/A'}
    Indications: {', '.join(drug.indications) if drug.indications else 'N/A'}
    Contraindications: {', '.join(drug.contraindications) if drug.contraindications else 'N/A'}
    Warnings: {', '.join(drug.warnings) if drug.warnings else 'N/A'}
    Dosing: {drug.dosing or 'N/A'}
    
    Create professional content that:
    - Explains complex medical terms clearly
    - Maintains medical accuracy
    - Is structured with clear headings
    - Is optimized for healthcare professionals
    - Includes clinical considerations
    
    Format as HTML with proper heading structure.
    """
    
    response = await call_claude(prompt)
    return {"enhanced_content": response}

async def generate_faq(drug: DrugLabelData) -> Dict[str, List[Dict[str, str]]]:
    prompt = f"""
    Generate 5 frequently asked questions and answers about this drug for healthcare providers.
    
    Drug: {drug.name}
    Generic Name: {drug.generic_name or 'N/A'}
    Indications: {', '.join(drug.indications) if drug.indications else 'N/A'}
    
    Format as JSON array with objects containing "question" and "answer" fields.
    Focus on clinical questions providers commonly ask.
    """
    
    response = await call_claude(prompt)
    try:
        faq_data = json.loads(response)
        return {"faq": faq_data}
    except json.JSONDecodeError:
        return {"faq": []}

async def generate_related_suggestions(drug: DrugLabelData) -> Dict[str, List[str]]:
    prompt = f"""
    Suggest 5 related drugs or drug categories that would be relevant to healthcare providers researching {drug.name}.
    
    Drug: {drug.name}
    Generic Name: {drug.generic_name or 'N/A'}
    Indications: {', '.join(drug.indications) if drug.indications else 'N/A'}
    
    Return as a simple comma-separated list of drug names or categories.
    """
    
    response = await call_claude(prompt)
    related_list = [item.strip() for item in response.split(',')]
    return {"related_drugs": related_list[:5]}

async def call_claude(prompt: str) -> str:
    try:
        response = claude_client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            temperature=0.3,
            system="You are a medical content expert helping create accurate, professional drug information for healthcare providers.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text
    except Exception as e:
        logger.error(f"Claude API error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI service unavailable")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)