"""The setup HTTP client must not forward credentials across a redirect."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent / 'fixtures'))
from fresh_baseline_stack import request


class Transport(unittest.TestCase):
    def test_redirect_is_returned_without_second_request(self):
        seen = []

        class Redirect(BaseHTTPRequestHandler):
            def do_POST(self):
                seen.append(self.path)
                self.rfile.read(int(self.headers.get('content-length', 0)))
                self.send_response(307)
                self.send_header('Location', '/must-not-be-requested')
                self.end_headers()

            def log_message(self, *args):
                pass

        with ThreadingHTTPServer(('127.0.0.1', 0), Redirect) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                status, _ = request('http://127.0.0.1:' + str(server.server_port),
                                    'POST', '/first', {'synthetic': True}, 'fixture-token')
                self.assertEqual(status, 307)
                self.assertEqual(seen, ['/first'])
            finally:
                server.shutdown()
                thread.join()


if __name__ == '__main__':
    unittest.main()
