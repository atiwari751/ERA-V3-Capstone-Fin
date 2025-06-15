import subprocess
import sys
import time
import signal
import os
import locale

# Set UTF-8 encoding for the current process
if sys.platform == 'win32':
    # Set console code page to UTF-8
    subprocess.run(['chcp', '65001'], shell=True, check=False)
    # Also set Python's encoding for stdout/stderr
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    # Set locale
    locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')

def start_apis():
    """Start both the main API and the scheme API"""
    print("Starting APIs...")
    
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(os.getcwd(), "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    # Prepare environment with explicit encoding settings
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    
    # Start the main API with output redirection
    main_api_stdout = open(os.path.join(logs_dir, "main_api_stdout.log"), "w", encoding='utf-8')
    main_api_stderr = open(os.path.join(logs_dir, "main_api_stderr.log"), "w", encoding='utf-8')
    
    main_api = subprocess.Popen(
        [sys.executable, "api.py"],
        stdout=main_api_stdout,
        stderr=main_api_stderr,
        env=env
    )
    print(f"Main API started with PID {main_api.pid}")
    
    # Give the main API time to start up
    time.sleep(2)
    
    # Check if it's still running
    if main_api.poll() is not None:
        print(f"ERROR: Main API failed to start. Exit code: {main_api.returncode}")
        print(f"Check logs in {logs_dir} for details")
        return None, None
    
    # Start the scheme API with output redirection
    scheme_api_stdout = open(os.path.join(logs_dir, "scheme_api_stdout.log"), "w", encoding='utf-8')
    scheme_api_stderr = open(os.path.join(logs_dir, "scheme_api_stderr.log"), "w", encoding='utf-8')
    
    scheme_api = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "scheme_api:app", "--host", "0.0.0.0", "--port", "8002"],
        stdout=scheme_api_stdout,
        stderr=scheme_api_stderr,
        env=env
    )
    print(f"Scheme API started with PID {scheme_api.pid}")
    
    # Give the scheme API time to start up
    time.sleep(2)
    
    # Check if it's still running
    if scheme_api.poll() is not None:
        print(f"ERROR: Scheme API failed to start. Exit code: {scheme_api.returncode}")
        print(f"Check logs in {logs_dir} for details")
        stop_apis(main_api, None)
        return None, None
    
    return main_api, scheme_api

def stop_apis(main_api, scheme_api):
    """Stop both APIs"""
    print("Stopping APIs...")
    
    # Stop the main API
    if main_api and main_api.poll() is None:
        print("Stopping Main API...")
        main_api.terminate()
        try:
            main_api.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("Main API did not terminate gracefully, forcing...")
            main_api.kill()
        print("Main API stopped")
    
    # Stop the scheme API
    if scheme_api and scheme_api.poll() is None:
        print("Stopping Scheme API...")
        scheme_api.terminate()
        try:
            scheme_api.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("Scheme API did not terminate gracefully, forcing...")
            scheme_api.kill()
        print("Scheme API stopped")

def handle_signal(sig, frame):
    """Handle Ctrl+C"""
    print("\nReceived signal to terminate")
    stop_apis(main_api, scheme_api)
    sys.exit(0)

def print_log_tail(log_file, lines=10):
    """Print the last few lines of a log file"""
    try:
        with open(log_file, 'r') as f:
            tail = f.readlines()[-lines:]
            print(f"Last {lines} lines of {log_file}:")
            for line in tail:
                print(f"  {line.strip()}")
    except Exception as e:
        print(f"Could not read log file {log_file}: {e}")

if __name__ == "__main__":
    # Register signal handler for clean shutdown
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    main_api = None
    scheme_api = None
    
    try:
        # Start the APIs
        main_api, scheme_api = start_apis()
        
        if not main_api or not scheme_api:
            print("Failed to start one or both APIs. Exiting.")
            sys.exit(1)
        
        # Keep the script running
        print("APIs are running. Press Ctrl+C to stop.")
        while True:
            # Check if either process has terminated
            if main_api.poll() is not None:
                print(f"Main API exited unexpectedly with code {main_api.returncode}")
                print_log_tail(os.path.join("logs", "main_api_stderr.log"))
                break
            
            if scheme_api.poll() is not None:
                print(f"Scheme API exited unexpectedly with code {scheme_api.returncode}")
                print_log_tail(os.path.join("logs", "scheme_api_stderr.log"))
                break
            
            time.sleep(1)
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Ensure APIs are stopped when the script exits
        stop_apis(main_api, scheme_api) 