import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo, Socket } from 'node:net'

/**
 * A throwaway HTTP server that stands in for Directus.
 *
 * Deliberately a real socket rather than a mocked `fetch`: the behaviour under
 * test includes how Node's fetch reports a refused connection, a destroyed
 * socket and an unanswered request, and a mock cannot reproduce any of those.
 *
 * It also captures the outbound request, which is what lets a test assert the
 * exact body that would have been written to the shared collection - the
 * substitute for actually writing a row.
 */

export type CapturedRequest = {
  method: string
  url: string
  headers: Record<string, string | undefined>
  raw: string
  json: unknown
}

export type StubHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  captured: CapturedRequest
) => void

export type Stub = {
  url: string
  requests: CapturedRequest[]
  close: () => Promise<void>
}

export async function startStub(handler: StubHandler): Promise<Stub> {
  const requests: CapturedRequest[] = []
  // Tracked so close() can tear down a connection the handler never answered,
  // otherwise the server keeps the event loop alive and the suite hangs.
  const sockets = new Set<Socket>()

  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      let json: unknown = null
      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        /* leave null; a test may be sending deliberate garbage */
      }
      const captured: CapturedRequest = {
        method: req.method ?? '',
        url: req.url ?? '',
        headers: req.headers as Record<string, string | undefined>,
        raw,
        json
      }
      requests.push(captured)
      handler(req, res, captured)
    })
  })

  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of sockets) s.destroy()
        server.close(() => resolve())
      })
  }
}

/** Convenience: answer once with a status and a JSON body. */
export const jsonReply =
  (status: number, body: unknown): StubHandler =>
  (_req, res) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

/** A Directus-shaped error envelope. */
export const directusError = (message: string, code?: string) => ({
  errors: [{ message, extensions: code ? { code } : {} }]
})
