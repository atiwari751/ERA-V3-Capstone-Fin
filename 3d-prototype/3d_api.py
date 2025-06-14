from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="3D Visualization API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Cuboid(BaseModel):
    id: int
    width: float
    height: float
    depth: float
    position_x: float
    position_y: float
    position_z: float
    color: str

# Hardcoded cuboid data - now with 6 schemes
cuboids = [
    Cuboid(
        id=1,
        width=2,
        height=1,
        depth=1,
        position_x=0,
        position_y=0,
        position_z=0,
        color="#ff4040"  # Red
    ),
    Cuboid(
        id=2,
        width=1,
        height=2,
        depth=1,
        position_x=0,
        position_y=0,
        position_z=0,
        color="#40ff40"  # Green
    ),
    Cuboid(
        id=3,
        width=1,
        height=1,
        depth=2,
        position_x=0,
        position_y=0,
        position_z=0,
        color="#4040ff"  # Blue
    ),
    Cuboid(
        id=4,
        width=1.5,
        height=1.5,
        depth=1.5,
        position_x=0,
        position_y=0,
        position_z=0,
        color="#ffff40"  # Yellow
    ),
    Cuboid(
        id=5,
        width=2,
        height=1.5,
        depth=0.8,
        position_x=0,
        position_y=0,
        position_z=0,
        color="#ff40ff"  # Purple
    ),
    Cuboid(
        id=6,
        width=0.8,
        height=2.5,
        depth=1.2,
        position_x=0,
        position_y=0,
        position_z=0,
        color="#40ffff"  # Cyan
    ),
]

@app.get("/cuboids", response_model=List[Cuboid])
async def get_cuboids():
    """Return a list of hardcoded cuboids for 3D visualization"""
    return cuboids

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("3d_api:app", host="0.0.0.0", port=8002, reload=True) 