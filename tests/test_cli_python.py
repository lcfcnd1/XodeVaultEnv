import importlib.util
import json
import os
import pathlib
import socket
import subprocess
import sys
import time
import urllib.request
import uuid

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
NODE_BUILDER = (
    "const { buildPythonDecryptor } = require('./backend/src/pythonDecryptor'); "
    "process.stdout.write(buildPythonDecryptor(process.argv[1], process.argv[2]));"
)


def generated_script(tmp_path, share_id='test-share', base_url='http://127.0.0.1:1'):
    result = subprocess.run(
        ['node', '-e', NODE_BUILDER, share_id, base_url],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    script = tmp_path / f'{share_id}.py'
    script.write_text(result.stdout, encoding='utf-8')
    return script


def import_cli_module(script):
    module_name = f'generated_cli_{uuid.uuid4().hex}'
    spec = importlib.util.spec_from_file_location(module_name, script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def oracle_cases():
    nonce12 = bytes(range(12))
    nonce13 = b'nonce-not-12!'
    return [
        pytest.param(b'', nonce12, b'', id='empty'),
        pytest.param(b'X', nonce12, b'A', id='one-byte'),
        pytest.param(os.urandom(15), nonce12, b'A' * 16, id='fifteen-bytes'),
        pytest.param(os.urandom(16), nonce12, b'A' * 17, id='sixteen-bytes'),
        pytest.param(os.urandom(17), nonce12, b'A' * 32, id='seventeen-bytes'),
        pytest.param(os.urandom(4096), nonce12, b'header-data', id='4096-bytes'),
        pytest.param(
            'APP_NAME=XodeVault\r\nGREETING=¡Hola, мир!\r\nEMOJI=🔐🚀\r\nEMPTY=\r\n'.encode('utf-8'),
            nonce12,
            b'',
            id='env-crlf-unicode',
        ),
        pytest.param(b'non-12-byte nonce', nonce13, b'', id='nonce-non12-no-aad'),
        pytest.param(b'non-12-byte nonce with AAD', nonce13, b'not divisible', id='nonce-non12-aad'),
        pytest.param(b'non-12-byte nonce with padded AAD', nonce13, b'B' * 16, id='nonce-non12-aad-divisible'),
    ]


@pytest.mark.parametrize('plaintext, nonce, aad', oracle_cases())
def test_python_aes_gcm_matches_cryptography_oracle(tmp_path, plaintext, nonce, aad):
    key = bytes(range(32))
    module = import_cli_module(generated_script(tmp_path))

    oracle_ciphertext = AESGCM(key).encrypt(nonce, plaintext, aad)
    python_ciphertext = module.encrypt_aes_gcm(key, nonce, plaintext, aad)

    assert python_ciphertext == oracle_ciphertext
    assert module.decrypt_aes_gcm(key, nonce, oracle_ciphertext, aad) == plaintext


def run_cli(script, key):
    return subprocess.run(
        [sys.executable, str(script), key.hex()],
        capture_output=True,
        timeout=15,
    )


def test_missing_key_fails_without_stdout(tmp_path):
    script = generated_script(tmp_path)
    result = subprocess.run([sys.executable, str(script)], capture_output=True, timeout=10)
    assert result.returncode == 1
    assert result.stdout == b''
    assert b'ShareKey is required' in result.stderr


def reserve_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def request_json(url, method='GET', payload=None, headers=None):
    body = json.dumps(payload).encode('utf-8') if payload is not None else None
    request = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    if body is not None:
        request.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.status, json.loads(response.read().decode('utf-8'))


def wait_for_app(base_url, process):
    deadline = time.time() + 15
    while time.time() < deadline:
        if process.poll() is not None:
            raise AssertionError(process.stderr.read())
        try:
            status, _ = request_json(base_url + '/health')
            if status == 200:
                return
        except OSError:
            time.sleep(0.1)
    raise AssertionError('Node app did not start')


def test_real_api_share_round_trip_and_subprocess(tmp_path):
    port = reserve_port()
    base_url = f'http://127.0.0.1:{port}'
    env = os.environ.copy()
    env.update({
        'PORT': str(port),
        'BASE_URL': base_url,
        'JWT_SECRET': 'pytest-only-secret',
        'FRONTEND_URL': base_url,
    })
    process = subprocess.Popen(
        ['node', 'src/server.js'],
        cwd=BACKEND,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        wait_for_app(base_url, process)
        username = f'pytest_{uuid.uuid4().hex}'
        password = 'pytest-password-123'
        _, auth = request_json(
            base_url + '/api/auth/register',
            method='POST',
            payload={'username': username, 'password': password},
        )
        key = os.urandom(32)
        nonce = os.urandom(12)
        plaintext = 'DB_URL=postgres://demo\r\nGREETING=¡Hola, мир!\r\n'.encode('utf-8')
        encrypted = AESGCM(key).encrypt(nonce, plaintext, None)
        _, share = request_json(
            base_url + '/api/share',
            method='POST',
            payload={'content': encrypted.hex(), 'iv': nonce.hex(), 'label': 'pytest'},
            headers={'Authorization': f"Bearer {auth['token']}"},
        )

        cli_request = urllib.request.Request(
            base_url + f"/api/cli/{share['id']}/py",
            headers={'Host': 'untrusted-host.example'},
        )
        with urllib.request.urlopen(cli_request, timeout=10) as response:
            script_text = response.read().decode('utf-8')
            assert response.headers['Content-Type'].startswith('text/plain; charset=utf-8')
        assert base_url in script_text
        assert 'untrusted-host.example' not in script_text
        assert key.hex() not in script_text
        assert nonce.hex() not in script_text

        script = tmp_path / 'real-api-cli.py'
        script.write_text(script_text, encoding='utf-8')
        module = import_cli_module(script)
        assert module.decrypt_aes_gcm(key, nonce, encrypted) == plaintext

        subprocess_result = run_cli(script, key)
        assert subprocess_result.returncode == 0, subprocess_result.stderr.decode()
        assert subprocess_result.stdout == plaintext
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
