#!/usr/bin/env python3
"""Fetch URL(s) without TLS verification (Relic API uses a legacy CN-only cert).

Single URL (player-card): prints the raw response body, 15s timeout.
Multiple URLs or --ndjson: one JSON object per line
  {"url": "...", "ok": true, "body": {...}} or {"url": "...", "ok": false, "error": "..."}.
"""
import json
import ssl
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

PER_URL_TIMEOUT = 8
SINGLE_URL_TIMEOUT = 15


def ssl_context() -> ssl.SSLContext:
	ctx = ssl.create_default_context()
	ctx.check_hostname = False
	ctx.verify_mode = ssl.CERT_NONE
	return ctx


def fetch_one(url: str, timeout: float) -> str:
	import urllib.request

	with urllib.request.urlopen(url, context=ssl_context(), timeout=timeout) as response:
		return response.read().decode()


def emit_ndjson(url: str, timeout: float) -> None:
	try:
		raw = fetch_one(url, timeout)
		sys.stdout.write(json.dumps({'url': url, 'ok': True, 'body': json.loads(raw)}) + '\n')
	except Exception as error:
		sys.stdout.write(json.dumps({'url': url, 'ok': False, 'error': str(error)}) + '\n')


def fetch_many_ndjson(urls) -> None:
	if len(urls) == 1:
		emit_ndjson(urls[0], PER_URL_TIMEOUT)
		return

	workers = min(8, len(urls))
	with ThreadPoolExecutor(max_workers=workers) as pool:
		futures = {pool.submit(fetch_one, url, PER_URL_TIMEOUT): url for url in urls}
		for future in as_completed(futures):
			url = futures[future]
			try:
				raw = future.result()
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

	fetch_many_ndjson(args)


if __name__ == '__main__':
	main()
