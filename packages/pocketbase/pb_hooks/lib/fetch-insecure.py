#!/usr/bin/env python3
"""Fetch URL(s) without TLS verification (Relic API uses a legacy CN-only cert).

Single URL (player-card): prints the raw response body, 15s timeout.
Multiple URLs or --ndjson: one JSON object per line
  {"url": "...", "ok": true, "body": {...}} or {"url": "...", "ok": false, "error": "..."}.
"""
import json
import ssl
import sys
import time
import urllib.request

PER_URL_TIMEOUT = 8
SINGLE_URL_TIMEOUT = 15
MAX_TOTAL_SECONDS = 40


def ssl_context() -> ssl.SSLContext:
	ctx = ssl.create_default_context()
	ctx.check_hostname = False
	ctx.verify_mode = ssl.CERT_NONE
	return ctx


def fetch_one(url: str, timeout: float) -> str:
	with urllib.request.urlopen(url, context=ssl_context(), timeout=timeout) as response:
		return response.read().decode()


def emit_ndjson(url: str, timeout: float) -> None:
	try:
		raw = fetch_one(url, timeout)
		sys.stdout.write(json.dumps({'url': url, 'ok': True, 'body': json.loads(raw)}) + '\n')
	except Exception as error:
		sys.stdout.write(json.dumps({'url': url, 'ok': False, 'error': str(error)}) + '\n')


def main() -> None:
	args = sys.argv[1:]
	ndjson = False
	if args and args[0] == '--ndjson':
		ndjson = True
		args = args[1:]

	if not args:
		raise SystemExit('usage: fetch-insecure.py [--ndjson] <url> [url...]')

	if ndjson and len(args) == 1 and args[0].startswith('['):
		try:
			parsed = json.loads(args[0])
			if isinstance(parsed, list):
				args = [str(item) for item in parsed]
		except json.JSONDecodeError:
			pass

	if not ndjson and len(args) == 1:
		sys.stdout.write(fetch_one(args[0], SINGLE_URL_TIMEOUT))
		return

	started = time.monotonic()
	for url in args:
		remaining = MAX_TOTAL_SECONDS - (time.monotonic() - started)
		if remaining <= 0:
			sys.stdout.write(json.dumps({'url': url, 'ok': False, 'error': 'tick budget exceeded'}) + '\n')
			continue
		emit_ndjson(url, min(PER_URL_TIMEOUT, remaining))


if __name__ == '__main__':
	main()
