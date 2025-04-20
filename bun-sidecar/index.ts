import './parser.js';

Bun.serve({
	port: 55123,
	fetch(req, server) {
		if (server.upgrade(req)) {
			return;
		}
		return new Response('Upgrade failed', { status: 500 });
	},
	websocket: {
		message(ws, message) {
			console.log('WebSocket message received:', message);
		}, // a message is received
		open(ws) {
			console.log('WebSocket opened');
		}, // a socket is opened
		close(ws, code, message) {
			console.log('WebSocket closed');
		}, // a socket is closed
		drain(ws) {
			console.log('WebSocket drained');
		} // the socket is ready to receive more data
	}
});
