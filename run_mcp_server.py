import subprocess
import sys
import signal
import os
import time
import socket

def is_port_in_use(port):
    """Check if a port is in use by attempting to bind to it"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def main():
    mcp_port = 8080
    
    # Check if MCP server is already running
    if is_port_in_use(mcp_port):
        print(f"MCP server is already running on port {mcp_port}.")
        print("Please stop the existing server before starting a new one.")
        return 1
    
    print(f"Starting MCP server in standalone mode on port {mcp_port}...")
    try:
        # Start MCP server process with port configuration
        env = os.environ.copy()
        env["MCP_PORT"] = str(mcp_port)  # Set port via environment variable
        
        mcp_process = subprocess.Popen(
            [sys.executable, "mcp-server.py"],
            cwd="./",
            # Show output in console
            stdout=None,
            stderr=None,
            env=env
        )
        
        print(f"MCP server running with PID {mcp_process.pid}")
        print(f"Server is listening on port {mcp_port}")
        print("Press Ctrl+C to stop the server")
        
        # Keep the script running to maintain the server
        try:
            while True:
                time.sleep(1)
                
                # Verify server is still running
                if mcp_process.poll() is not None:
                    print(f"MCP server process exited unexpectedly with code {mcp_process.returncode}")
                    return 1
                    
        except KeyboardInterrupt:
            print("\nShutting down MCP server...")
            
            try:
                if sys.platform == 'win32':
                    # Windows
                    mcp_process.terminate()
                else:
                    # Unix
                    os.kill(mcp_process.pid, signal.SIGTERM)
                mcp_process.wait(timeout=5)
                print("MCP server stopped gracefully")
            except Exception as e:
                print(f"Error stopping MCP server: {e}")
                if mcp_process.poll() is None:
                    # Force kill if still running
                    mcp_process.kill()
                    print("MCP server killed")
                    
    except Exception as e:
        print(f"Error running MCP server: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main()) 