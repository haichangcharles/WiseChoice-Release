#!/usr/bin/env python3
"""
WiseChoice AI Agent API server.
Exposes a local HTTP interface for the browser extension.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import run_workflow, WorkflowInput
import uvicorn
import json

app = FastAPI(title="WiseChoice AI Agent API")

# Allow cross-origin requests (needed for the browser extension)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CompareRequest(BaseModel):
    """Comparison request payload."""
    products: list[dict]  # List of product dictionaries

class CompareResponse(BaseModel):
    """Structured comparison response."""
    title: str
    tldr: str
    strategy: str
    analysis: str
    reasons: str
    success: bool = True

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "WiseChoice AI Agent API",
        "status": "running",
        "version": "1.0.0"
    }

@app.post("/api/compare", response_model=CompareResponse)
async def compare_products(request: CompareRequest):
    """
    Compare products and return the AI analysis.
    """
    try:
        # Build the prompt for the agent
        prompt = "Compare the following products and recommend one confident purchase decision:\n\n"
        
        for i, product in enumerate(request.products, 1):
            prompt += f"Product {i}: {product.get('title', 'Unknown product')}\n"
            prompt += f"- Price: {product.get('price', {}).get('raw', 'Unknown')}\n"
            
            if product.get('brand'):
                prompt += f"- Brand: {product['brand']}\n"
            
            if product.get('asin'):
                prompt += f"- ASIN: {product['asin']}\n"
            
            # Add bullet highlights
            if product.get('bullets'):
                prompt += "- Highlights:\n"
                for bullet in product['bullets'][:5]:  # Limit to five bullet points
                    prompt += f"  • {bullet}\n"
            
            # Add key specs
            if product.get('tech'):
                prompt += "- Key specs:\n"
                for key, value in list(product['tech'].items())[:5]:  # Limit to five specs
                    prompt += f"  • {key}: {value}\n"
            
            prompt += f"- Link: {product.get('source', '')}\n\n"
        
        prompt += "Respond using your decision-forward analysis format."
        
        # Invoke the agent
        workflow_input = WorkflowInput(input_as_text=prompt)
        result = await run_workflow(workflow_input)
        
        # Return the structured result
        parsed = result["output_parsed"]
        return CompareResponse(
            title=parsed['title'],
            tldr=parsed['tldr'],
            strategy=parsed['strategy'],
            analysis=parsed['analysis'],
            reasons=parsed['reasons'],
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 WiseChoice AI Agent API Server")
    print("=" * 60)
    print()
    print("📍 Service address: http://localhost:8765")
    print("📚 API docs: http://localhost:8765/docs")
    print()
    print("⚠️  Make sure the OPENAI_API_KEY environment variable is set")
    print()
    print("Press Ctrl+C to stop the service")
    print("=" * 60)
    print()
    
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")
