const { spawn } = require('child_process');
const path = require('path');

// Function to start a process
function startProcess(command, args, name, cwd = process.cwd()) {
  console.log(`Starting ${name}...`);
  
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'pipe',
  });
  
  proc.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });
  
  proc.stderr.on('data', (data) => {
    console.error(`[${name}] ${data.toString().trim()}`);
  });
  
  proc.on('close', (code) => {
    console.log(`${name} process exited with code ${code}`);
  });
  
  return proc;
}

// Start the FastAPI backend
const backend = startProcess(
  'uvicorn',
  ['api:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
  'Backend'
);

// Start the React frontend
const frontend = startProcess(
  'npm',
  ['start'],
  'Frontend'
);

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

console.log('Development environment started. Press Ctrl+C to stop.'); 