#!/usr/bin/env python3
"""
WiseChoice AI Agent API server.
Exposes a local HTTP interface for the browser extension.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import run_workflow
import uvicorn
import json
import os
from datetime import datetime

app = FastAPI(title="WiseChoice AI Agent API")

LOG_FILE = "analysis_log.json"

def log_analysis(products: list[dict], response_data: dict):
    """Log the analysis input and output to a JSON file."""
    try:
        # Load existing logs
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                try:
                    logs = json.load(f)
                except json.JSONDecodeError:
                    logs = []
        else:
            logs = []

        # Determine new ID
        new_id = 1
        if logs:
            new_id = max(item.get("id", 0) for item in logs) + 1

        # Extract category (fallback to "Unknown")
        category = "Unknown"
        if products and products[0].get("category"):
            category = products[0]["category"]

        # Format raw input
        raw_input = {}
        for i, product in enumerate(products):
            # Use product_a_text, product_b_text for the first two, then product_3...
            key = f"product_{i+1}_text"
            if i == 0: key = "product_a_text"
            elif i == 1: key = "product_b_text"
            
            # Create a text representation of the product
            text_repr = f"Title: {product.get('title', '')}\n"
            text_repr += f"Price: {product.get('price', {}).get('raw', '')}\n"
            text_repr += f"Bullets: {json.dumps(product.get('bullets', []), ensure_ascii=False)}\n"
            text_repr += f"Specs: {json.dumps(product.get('tech', {}), ensure_ascii=False)}"
            
            raw_input[key] = text_repr

        # Construct log entry
        entry = {
            "id": new_id,
            "timestamp": datetime.now().isoformat(),
            "category": category,
            "raw_input": raw_input,
            "wisechoice_output": response_data
        }

        logs.append(entry)

        # Save back to file
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        print(f"Error logging analysis: {e}")

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
        # workflow_input = WorkflowInput(input_as_text=prompt) # Removed
        result = await run_workflow(prompt)
        
        # Return the structured result
        parsed = result["output_parsed"]
        
        response_data = {
            "title": parsed['title'],
            "tldr": parsed['tldr'],
            "strategy": parsed['strategy'],
            "analysis": parsed['analysis'],
            "reasons": parsed['reasons'],
            "success": True
        }
        
        # Log the analysis
        log_analysis(request.products, response_data)
        
        return CompareResponse(**response_data)
        
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
