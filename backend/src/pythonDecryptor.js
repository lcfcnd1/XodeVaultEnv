function buildPythonDecryptor(shareId, baseUrl) {
  return `#!/usr/bin/env python3
"""XodeVault zero-dependency Python 3 CLI decryptor."""
import hmac
import json
import sys
import urllib.error
import urllib.request

SHARE_ID = ${JSON.stringify(shareId)}
BASE_URL = ${JSON.stringify(baseUrl)}

SBOX = (
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
)
RCON = (0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36)

def _rot_word(word):
    return word[1:] + word[:1]

def _sub_word(word):
    return bytes(SBOX[b] for b in word)

def _expand_key(key):
    words = [key[i:i + 4] for i in range(0, 32, 4)]
    for i in range(8, 60):
        temp = words[i - 1]
        if i % 8 == 0:
            temp = _sub_word(_rot_word(temp))
            temp = bytes((temp[0] ^ RCON[i // 8], temp[1], temp[2], temp[3]))
        elif i % 8 == 4:
            temp = _sub_word(temp)
        words.append(bytes(a ^ b for a, b in zip(words[i - 8], temp)))
    return b''.join(words)

def _xtime(value):
    return ((value << 1) ^ (0x11b if value & 0x80 else 0)) & 0xff

def _mix_columns(state):
    for col in range(4):
        i = col * 4
        a0, a1, a2, a3 = state[i:i + 4]
        x = a0 ^ a1 ^ a2 ^ a3
        state[i] = a0 ^ x ^ _xtime(a0 ^ a1)
        state[i + 1] = a1 ^ x ^ _xtime(a1 ^ a2)
        state[i + 2] = a2 ^ x ^ _xtime(a2 ^ a3)
        state[i + 3] = a3 ^ x ^ _xtime(a3 ^ a0)

def _encrypt_block(expanded_key, block):
    state = [a ^ b for a, b in zip(block, expanded_key[:16])]
    for round_number in range(1, 14):
        state = [SBOX[value] for value in state]
        state = [
            state[0], state[5], state[10], state[15],
            state[4], state[9], state[14], state[3],
            state[8], state[13], state[2], state[7],
            state[12], state[1], state[6], state[11],
        ]
        _mix_columns(state)
        round_key = expanded_key[round_number * 16:(round_number + 1) * 16]
        state = [a ^ b for a, b in zip(state, round_key)]
    state = [SBOX[value] for value in state]
    state = [
        state[0], state[5], state[10], state[15],
        state[4], state[9], state[14], state[3],
        state[8], state[13], state[2], state[7],
        state[12], state[1], state[6], state[11],
    ]
    return bytes(a ^ b for a, b in zip(state, expanded_key[224:240]))

def _gf_mul(x, y):
    result = 0
    reduction = 0xe1000000000000000000000000000000
    for _ in range(128):
        if y & (1 << 127):
            result ^= x
        x = (x >> 1) ^ (reduction if x & 1 else 0)
        y = (y << 1) & ((1 << 128) - 1)
    return result

def _ghash(hash_subkey, data):
    value = 0
    for offset in range(0, len(data), 16):
        block = int.from_bytes(data[offset:offset + 16], 'big')
        value = _gf_mul(value ^ block, hash_subkey)
    return value

def _inc32(counter):
    return counter[:12] + ((int.from_bytes(counter[12:], 'big') + 1) & 0xffffffff).to_bytes(4, 'big')

def decrypt_aes_gcm(key, iv, encrypted):
    if len(key) != 32:
        raise ValueError('ShareKey must be exactly 32 bytes (64 hex characters).')
    if len(iv) != 12:
        raise ValueError('The server returned an invalid IV; expected 12 bytes.')
    if len(encrypted) < 16:
        raise ValueError('The server returned an invalid encrypted payload.')
    ciphertext, expected_tag = encrypted[:-16], encrypted[-16:]
    expanded_key = _expand_key(key)
    hash_subkey = int.from_bytes(_encrypt_block(expanded_key, bytes(16)), 'big')
    j0 = iv + b'\\x00\\x00\\x00\\x01'
    padded_ciphertext = ciphertext + b'\\x00' * ((16 - len(ciphertext) % 16) % 16)
    auth_data = padded_ciphertext + (0).to_bytes(8, 'big') + (len(ciphertext) * 8).to_bytes(8, 'big')
    actual_tag = (int.from_bytes(_encrypt_block(expanded_key, j0), 'big') ^ _ghash(hash_subkey, auth_data)).to_bytes(16, 'big')
    if not hmac.compare_digest(actual_tag, expected_tag):
        raise ValueError('Authentication failed: wrong ShareKey or tampered ciphertext.')
    plaintext = bytearray()
    counter = j0
    for offset in range(0, len(ciphertext), 16):
        counter = _inc32(counter)
        keystream = _encrypt_block(expanded_key, counter)
        plaintext.extend(a ^ b for a, b in zip(ciphertext[offset:offset + 16], keystream))
    return bytes(plaintext)

def _fetch_payload():
    with urllib.request.urlopen(BASE_URL + '/api/share/' + SHARE_ID, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))

def main():
    if len(sys.argv) < 2 or not sys.argv[1]:
        print('[XodeVault] Error: ShareKey is required.', file=sys.stderr)
        print('Usage: curl -s ' + BASE_URL + '/api/cli/' + SHARE_ID + '/py | python3 - SHARE_KEY > .env', file=sys.stderr)
        return 1
    try:
        share_key = bytes.fromhex(sys.argv[1])
        print('[XodeVault] Fetching encrypted payload...', file=sys.stderr)
        payload = _fetch_payload()
        if payload.get('error'):
            raise ValueError('Server error: ' + str(payload['error']))
        encrypted = bytes.fromhex(payload['content'])
        iv = bytes.fromhex(payload['iv'])
        print('[XodeVault] Decrypting locally with your ShareKey...', file=sys.stderr)
        plaintext = decrypt_aes_gcm(share_key, iv, encrypted).decode('utf-8')
        sys.stdout.write(plaintext)
        print('[XodeVault] Done. Decryption successful.', file=sys.stderr)
        return 0
    except (ValueError, UnicodeDecodeError, KeyError, json.JSONDecodeError, urllib.error.URLError, OSError) as error:
        print('[XodeVault] Decryption failed: ' + str(error), file=sys.stderr)
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
`;
}

module.exports = { buildPythonDecryptor };
