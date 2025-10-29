import { FastifyInstance } from 'fastify';

type HttpErrorType = 'badRequest' | 'unauthorized' | 'notFound';

const statusMap: Record<HttpErrorType, number> = {
  badRequest: 400,
  unauthorized: 401,
  notFound: 404,
};

export const throwHttpError = (app: FastifyInstance, type: HttpErrorType, message: string): never => {
  const factory = app.httpErrors?.[type];
  if (factory) {
    throw factory(message);
  }

  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusMap[type];
  throw error;
};
