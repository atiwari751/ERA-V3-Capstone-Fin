# 3D Visualization Prototype

This is a simple prototype for 3D visualization using React Three Fiber and FastAPI.

## Features

- Displays 4 cuboids with different dimensions and colors
- Interactive 3D scene with orbit controls
- Cuboids respond to hover and click events
- Simple animations (floating and rotation)

## Setup

### Backend

1. Make sure you have Python and FastAPI installed
2. Run the backend server:
   ```
   cd 3d-prototype
   python 3d_api.py
   ```
3. The API will be available at `http://localhost:8002`

### Frontend

1. Install dependencies:
   ```
   cd 3d-prototype
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Open your browser to `http://localhost:3000`

## Interaction

- **Orbit**: Click and drag to rotate the scene
- **Zoom**: Scroll to zoom in/out
- **Pan**: Right-click and drag to pan
- **Interact with cuboids**: Hover to highlight, click to animate

## Tech Stack

- **Frontend**: React, Three.js, React Three Fiber, @react-three/drei
- **Backend**: FastAPI, Pydantic

## Next Steps

- Integrate this 3D visualization into the main Agent UI
- Connect to real data from the agent
- Add more complex 3D models and interactions 