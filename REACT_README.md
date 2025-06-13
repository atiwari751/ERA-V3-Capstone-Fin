# Agent UI - React Frontend

This is the React frontend for the Agent UI application. It communicates with the FastAPI backend to provide a user-friendly interface for interacting with the agent.

## Features

- Query input and submission
- Real-time display of agent processing status
- Expandable intermediate results
- Final answer display
- Session management

## Setup and Installation

1. Make sure you have Node.js and npm installed on your system.

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. The application will be available at `http://localhost:3000`.

## Backend Connection

The frontend is configured to connect to the FastAPI backend at `http://localhost:8000`. Make sure the backend is running before using the frontend.

To start the backend:
```
uvicorn api:app --host 0.0.0.0 --port 8000
```

## Deployment

### Build for production

```
npm run build
```

This will create a `build` directory with optimized production files.

### Deployment options

1. **Vercel/Netlify**: Deploy the frontend directly from your Git repository.
2. **Render**: Deploy both frontend and backend on Render.
3. **Railway**: Deploy the backend on Railway and frontend on Vercel/Netlify.
4. **AWS**: Deploy both frontend and backend on AWS services.

## Future Enhancements

- 3D visualization of generated schemes
- Customizable themes (cyberpunk, retro, futuristic)
- Human-in-the-loop functionality for approving intermediate results 