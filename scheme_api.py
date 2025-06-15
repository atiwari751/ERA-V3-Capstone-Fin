from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from scheme_models import Scheme, SchemeParameters, SchemeEvaluations
from scheme_service import scheme_service

app = FastAPI(title="Scheme API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/schemes", response_model=List[Scheme])
async def get_schemes():
    """Get all schemes"""
    return scheme_service.get_schemes()

@app.post("/schemes/clear")
async def clear_schemes():
    """Clear all schemes"""
    scheme_service.clear_schemes()
    return {"message": "All schemes cleared"}

@app.get("/schemes/{scheme_id}", response_model=Scheme)
async def get_scheme(scheme_id: int):
    """Get a specific scheme by ID"""
    schemes = scheme_service.get_schemes()
    for scheme in schemes:
        if scheme.id == scheme_id:
            return scheme
    raise HTTPException(status_code=404, detail=f"Scheme with ID {scheme_id} not found")

@app.post("/schemes/process_agent_results")
async def process_agent_results(agent_results: Dict[str, Any]):
    """Process agent results and extract schemes"""
    new_schemes = scheme_service.add_schemes_from_agent_results(agent_results)
    return {"message": f"Processed {len(new_schemes)} new schemes", "schemes": new_schemes}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Run with: uvicorn scheme_api:app --reload --port 8002
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("scheme_api:app", host="0.0.0.0", port=8002, reload=True) 