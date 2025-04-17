import { WebSocketServer } from 'ws';

const port = 55123;
const wss = new WebSocketServer({ port: port });

console.log(`WebSocket server started on ws://localhost:${port}`);

wss.on('connection', function connection(ws) {
	console.log('Client connected');

	ws.on('message', function message(data) {
		console.log('received: %s', data);
		// Echo message back to client
		ws.send(`Server received: ${data}`);
	});

	ws.on('close', () => {
		console.log('Client disconnected');
	});

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});

	ws.send('Welcome to the WebSocket server!');
});

wss.on('error', (error) => {
	console.error('WebSocket Server Error:', error);
});
