import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

import { Prisma } from '../generated/prisma/client.js'

// Throw this from a route to send a specific status code and message.
export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

// Runs when no route matched the request.
export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

// Central error handler. Express 5 forwards errors thrown in async handlers here automatically.
// It must declare 4 parameters so Express recognizes it as an error handler.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('; ')
    res.status(400).json({ error: message, issues: err.issues })
    return
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  // P2025: the record to update/delete does not exist.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ error: 'Record not found' })
    return
  }

  // Malformed JSON request body (thrown by express.json()).
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
