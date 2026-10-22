#!/usr/bin/env python3
"""Sanitize imported documentation and reject credential-bearing examples in CI.
Never print matches, query strings, or credential values.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

URL = re.compile(r'https?://[^\s<>"\x27`)\]]+')
AWS_ID = re.compile(r'(?:AKIA|ASIA)[A-Z0-9]{16}')
GOOGLE_KEY = re.compile(r'AIza[A-Za-z0-9_-]{35}')
PRIVATE_KEY = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
SENSITIVE_QUERY = re.compile(r'(?:[?&]|&amp;)(?:X-Amz-[^=\s]+|X-Goog-[^=\s]+|access_token|refresh_token|token|api[_-]?key|signature|sig|credential|security-token)=', re.I)
REPLACEMENT = 'https://example.invalid/reap/sanitized-document-download'

def sanitize(text):
    text = URL.sub(lambda match: REPLACEMENT if SENSITIVE_QUERY.search(match.group()) else match.group(), text)
    text = AWS_ID.sub('[REDACTED_AWS_ACCESS_KEY_ID]', text)
    text = GOOGLE_KEY.sub('[REDACTED_GOOGLE_API_KEY]', text)
    return text

def self_test():
    key = 'AS' + 'IA' + 'A' * 16
    original = 'download https://example.invalid/file?X-Amz-Credential=' + key + '&X-Amz-Security-Token=dummy&X-Amz-Signature=dummy'
    result = sanitize(original)
    assert result == 'download ' + REPLACEMENT
    assert key not in result and 'Security-Token' not in result
    assert sanitize('https://reap.readme.io/docs/universal-kyb') == 'https://reap.readme.io/docs/universal-kyb'
    assert sanitize('AWS ID: ' + key) == 'AWS ID: [REDACTED_AWS_ACCESS_KEY_ID]'
    assert sanitize('https://example.invalid/file?access_token=dummy') == REPLACEMENT
    assert PRIVATE_KEY.search('-----BEGIN ' + 'PRIVATE KEY-----')
    assert sanitize(result) == result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reference-dir', type=Path, default=Path(__file__).resolve().parents[2] / 'docs/integrations/reap/reference')
    parser.add_argument('--write', action='store_true', help='Sanitize files and update stored hashes; preserve original source hashes.')
    args = parser.parse_args()
    self_test()
    root = args.reference_dir
    manifest_path = root / 'manifest.json'
    entries = json.loads(manifest_path.read_text())
    indexed = {entry['file']: entry for entry in entries if entry.get('success')}
    failures = []
    changed = []
    for path in sorted(root.glob('*.md')):
        before = path.read_text()
        if PRIVATE_KEY.search(before):
            failures.append((path.name, 'private-key marker requires manual removal'))
            continue
        after = sanitize(before)
        entry = indexed.get(path.name)
        if before != after:
            if not args.write:
                failures.append((path.name, 'credential-bearing documentation example'))
                continue
            if entry is None:
                failures.append((path.name, 'missing source manifest'))
                continue
            entry.setdefault('source_sha256', entry['sha256'])
            entry['sanitized'] = True
            path.write_text(after)
            entry['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
            changed.append(path.name)
        if entry is None or hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            failures.append((path.name, 'stored hash mismatch'))
    if args.write:
        manifest_path.write_text(json.dumps(entries, indent=2) + '\n')
    if failures:
        for filename, reason in failures:
            print(filename + ': ' + reason, file=sys.stderr)
        return 1
    print(f'Reference security and stored hashes verified: {len(indexed)} files; sanitized: {len(changed)}.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
