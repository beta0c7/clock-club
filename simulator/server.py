import os
import json
import posixpath
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

PORT = 8000
DIRECTORY = "simulator"
SHARED_DIR = "shared"

class SimulatorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path == "/api/configs":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            try:
                files = [f for f in os.listdir(SHARED_DIR) if f.endswith('.json')]
                self.wfile.write(json.dumps(files).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps([]).encode('utf-8'))
            return
            
        elif path.startswith("/api/config/"):
            filename = urllib.parse.unquote(path[len("/api/config/"):])
            # Security check
            if "/" in filename or "\\" in filename or not filename.endswith(".json"):
                self.send_error(400, "Bad Request")
                return
            
            filepath = os.path.join(SHARED_DIR, filename)
            if not os.path.exists(filepath):
                self.send_error(404, "File Not Found")
                return
                
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
            return
            
        # Default behavior: serve static files from DIRECTORY
        # To make it serve index.html on root:
        if path == "/":
            self.path = "/index.html"
            
        return super().do_GET()

def run(server_class=HTTPServer, handler_class=SimulatorHandler, port=PORT):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Starting simulator server on http://localhost:{port}/")
    httpd.serve_forever()

if __name__ == '__main__':
    # Change working directory to the project root
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    run()