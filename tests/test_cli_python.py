import http.server
import json
import pathlib
import socketserver
import subprocess
import sys
import threading


ROOT = pathlib.Path(__file__).resolve().parents[1]
NODE_BUILDER = "const { buildPythonDecryptor } = require('./backend/src/pythonDecryptor'); process.stdout.write(buildPythonDecryptor('roundtrip-id', process.argv[1]));"


class ShareHandler(http.server.BaseHTTPRequestHandler):
    payload = {}
    requests = []

    def do_GET(self):  # noqa: N802 - BaseHTTPRequestHandler API
        self.__class__.requests.append((self.path, self.headers.get('Content-Length')))
        body = json.dumps(self.__class__.payload).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


def make_server(payload):
    ShareHandler.payload = payload
    ShareHandler.requests = []
    server = socketserver.TCPServer(('127.0.0.1', 0), ShareHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


def generated_script(tmp_path, base_url):
    result = subprocess.run(
        ['node', '-e', NODE_BUILDER, base_url],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    script = tmp_path / 'decrypt.py'
    script.write_text(result.stdout, encoding='utf-8')
    return script


def run_script(script, key):
    return subprocess.run(
        [sys.executable, str(script), key],
        capture_output=True,
        text=True,
        timeout=10,
    )


def test_nist_aes256_gcm_vector(tmp_path):
    # NIST SP 800-38D AES-256-GCM test vector: empty AAD.
    key = '00' * 32
    iv = '00' * 12
    encrypted = 'cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919'
    server, thread = make_server({'content': encrypted, 'iv': iv})
    try:
        script = generated_script(tmp_path, f'http://127.0.0.1:{server.server_address[1]}')
        result = run_script(script, key)
        assert result.returncode == 0, result.stderr
        assert result.stdout == '\x00' * 16
    finally:
        server.shutdown()
        thread.join()


def test_round_trip_generated_script_and_contract(tmp_path):
    key = '00' * 32
    iv = '00' * 12
    encrypted = 'cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919'
    server, thread = make_server({'content': encrypted, 'iv': iv})
    try:
        script = generated_script(tmp_path, f'http://127.0.0.1:{server.server_address[1]}')
        result = run_script(script, key)
        assert result.returncode == 0
        assert result.stdout.encode('latin1') == b'\x00' * 16
        assert ShareHandler.requests == [('/api/share/roundtrip-id', None)]
    finally:
        server.shutdown()
        thread.join()


def test_wrong_key_and_tampered_ciphertext_are_silent_on_stdout(tmp_path):
    key = '00' * 32
    iv = '00' * 12
    encrypted = 'cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919'
    server, thread = make_server({'content': encrypted, 'iv': iv})
    try:
        script = generated_script(tmp_path, f'http://127.0.0.1:{server.server_address[1]}')
        wrong_key = run_script(script, '01' * 32)
        assert wrong_key.returncode == 1
        assert wrong_key.stdout == ''
        assert 'Authentication failed' in wrong_key.stderr

        tampered = encrypted[:-2] + ('00' if encrypted[-2:] != '00' else 'ff')
        ShareHandler.payload = {'content': tampered, 'iv': iv}
        tampered_result = run_script(script, key)
        assert tampered_result.returncode == 1
        assert tampered_result.stdout == ''
        assert 'Authentication failed' in tampered_result.stderr
    finally:
        server.shutdown()
        thread.join()
