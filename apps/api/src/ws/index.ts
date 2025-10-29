import { FastifyInstance } from 'fastify';

interface TickPayload {
  ms: number;
  multiplier: number;
  crashed: boolean;
  maxMultiplier: number;
}

export const registerWs = async (app: FastifyInstance) => {
  app.get('/lobby', { websocket: true }, (connection) => {
    const interval = setInterval(() => {
      connection.socket.send(JSON.stringify({ type: 'countdown', ms: 5000 }));
    }, 1000);
    connection.socket.on('close', () => clearInterval(interval));
  });

  app.get('/round/:id', { websocket: true }, (connection, req) => {
    const { id } = req.params as { id: string };
    app.log.info(`WS subscription ${id}`);
    connection.socket.send(
      JSON.stringify({
        type: 'snapshot',
        tokenSymbol: 'PLAY',
        basePrice: 1,
        crashAtMs: null,
        ticks: [],
      })
    );
    const interval = setInterval(() => {
      const tick: TickPayload = {
        ms: Date.now(),
        multiplier: 1 + Math.random() * 3,
        crashed: false,
        maxMultiplier: 3,
      };
      connection.socket.send(JSON.stringify({ type: 'tick', tick }));
    }, 1000);
    connection.socket.on('close', () => clearInterval(interval));
  });
};
