import subprocess
import sys
import signal
import os
import time
import socket

def is_mcp_server_running():
    """Check if a MCP server process is already running"""
    try:
        # Simple check for running python processes with mcp-server.py
        if sys.platform == 'win32':
            # Windows
            output = subprocess.check_output(
                "tasklist /FI \"IMAGENAME eq python.exe\" /FO CSV", 
                shell=True, 
                text=True
            )
            return "mcp-server.py" in output
        else:
            # Unix-like
            output = subprocess.check_output(
                "ps aux | grep 'mcp-server.py' | grep -v grep", 
                shell=True, 
                text=True
            )
            return len(output.strip()) > 0
    except subprocess.CalledProcessError:
        # Command failed or no matching processes
        return False

def main():
    # Check if MCP server is already running
    if is_mcp_server_running():
        print("MCP server appears to be already running.")
        print("Please stop the existing server before starting a new one.")
        return 1
    
    print("Starting MCP server in standalone mode...")
    try:
        # Start MCP server process
        mcp_process = subprocess.Popen(
            [sys.executable, "mcp-server.py"],
            cwd="./",
            # Show output in console
            stdout=None,
            stderr=None,
        )
        
        print(f"MCP server running with PID {mcp_process.pid}")
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