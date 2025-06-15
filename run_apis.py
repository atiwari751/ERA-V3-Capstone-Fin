import subprocess
import sys
import time
import signal
import os

def start_apis():
    """Start both the main API and the scheme API"""
    print("Starting APIs...")
    
    # Start the main API
    main_api = subprocess.Popen(
        [sys.executable, "api.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    print(f"Main API started with PID {main_api.pid}")
    
    # Start the scheme API
    scheme_api = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "scheme_api:app", "--host", "0.0.0.0", "--port", "8002"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    print(f"Scheme API started with PID {scheme_api.pid}")
    
    return main_api, scheme_api

def stop_apis(main_api, scheme_api):
    """Stop both APIs"""
    print("Stopping APIs...")
    
    # Stop the main API
    if main_api and main_api.poll() is None:
        main_api.terminate()
        try:
            main_api.wait(timeout=5)
        except subprocess.TimeoutExpired:
            main_api.kill()
        print("Main API stopped")
    
    # Stop the scheme API
    if scheme_api and scheme_api.poll() is None:
        scheme_api.terminate()
        try:
            scheme_api.wait(timeout=5)
        except subprocess.TimeoutExpired:
            scheme_api.kill()
        print("Scheme API stopped")

def handle_signal(sig, frame):
    """Handle Ctrl+C"""
    print("\nReceived signal to terminate")
    stop_apis(main_api, scheme_api)
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handler for clean shutdown
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    try:
        # Start the APIs
        main_api, scheme_api = start_apis()
        
        # Keep the script running
        print("APIs are running. Press Ctrl+C to stop.")
        while True:
            # Check if either process has terminated
            if main_api.poll() is not None:
                print(f"Main API exited with code {main_api.returncode}")
                break
            
            if scheme_api.poll() is not None:
                print(f"Scheme API exited with code {scheme_api.returncode}")
                break
            
            time.sleep(1)
    
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        # Ensure APIs are stopped when the script exits
        stop_apis(main_api, scheme_api) 