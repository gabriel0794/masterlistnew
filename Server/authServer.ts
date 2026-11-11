import { randomUUID, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'buffer'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Pool } from 'pg'

const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const port = Number(env.AUTH_PORT ?? 3001)
const username = env.AUTH_USERNAME ?? 'personnel'
const password = env.AUTH_PASSWORD ?? 'personnel'
const sessions = new Map<string, { username: string }>()
const database = new Pool({
  host: env.PGHOST ?? 'localhost',
  port: Number(env.PGPORT ?? 5432),
  database: env.PGDATABASE ?? 'masterlist',
  user: env.PGUSER ?? 'postgres',
  password: env.PGPASSWORD ?? 'postgres',
})

type Personnel = {
  id: string; name: string; position: string; assignment: string; birthdate: string; sg: string
  dateOfEntry: string; eligibility: string; fundSource: string; tinNo?: string; sssNo?: string
  philhealthNo?: string; gsisNo?: string; email: string; contact: string; address?: string; sex: string
  division: string; unit: string
  employmentType: 'Regular' | 'Contract of Service'
}

const personnelColumns = `
  id_no AS id, name, position, assignment, birthdate::text AS birthdate,
  salary_grade::text AS sg, date_of_entry::text AS "dateOfEntry", eligibility,
  fund_source AS "fundSource", tin_no AS "tinNo", sss_no AS "sssNo",
  philhealth_no AS "philhealthNo", gsis_no AS "gsisNo", email, contact, address, sex,
  COALESCE(personnel_unit, CASE
    WHEN unit IN ('Office of the Director', 'Management Support Division', 'Local Health Support Division',
      'Regulations, Licensing and Enforcement Division', 'PDOHO', 'Data Encoder', 'GIP', 'OJT') THEN NULL
    ELSE unit
  END) AS unit,
  COALESCE(division, CASE
    WHEN unit = 'PDOHO' THEN 'Provincial Department of Health Office'
    WHEN unit IN ('Office of the Director', 'Management Support Division', 'Local Health Support Division',
      'Regulations, Licensing and Enforcement Division') THEN unit
    WHEN unit IN ('Data Encoder', 'GIP', 'OJT') THEN 'Programs and Special Assignments'
    ELSE NULL
  END) AS division,
  employment_type AS "employmentType"
`

function toSqlDate(value: string | undefined) {
  const input = value?.trim()
  if (!input) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) throw new Error('Enter dates in a recognizable format.')
  return parsed.toISOString().slice(0, 10)
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  response.end(JSON.stringify(body))
}

function readBody<T>(request: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk: Buffer) => { body += chunk })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body) as T)
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
  })
}

function authenticated(request: IncomingMessage) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  return Boolean(token && sessions.has(token))
}

function matches(value: string | undefined, expected: string) {
  if (!value || value.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected))
}

async function startServer() {
  await database.query('ALTER TABLE personnel ADD COLUMN IF NOT EXISTS address TEXT')
  await database.query('ALTER TABLE personnel ADD COLUMN IF NOT EXISTS division TEXT')
  await database.query('ALTER TABLE personnel ADD COLUMN IF NOT EXISTS personnel_unit TEXT')
  await database.query(`
    UPDATE personnel
    SET division = CASE
      WHEN unit = 'PDOHO' THEN 'Provincial Department of Health Office'
      WHEN unit IN ('Data Encoder', 'GIP', 'OJT') THEN 'Programs and Special Assignments'
      ELSE unit
    END
    WHERE division IS NULL
      AND unit IN ('Office of the Director', 'Management Support Division', 'Local Health Support Division',
        'Regulations, Licensing and Enforcement Division', 'PDOHO', 'Data Encoder', 'GIP', 'OJT')
  `)
  createServer(async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method === 'OPTIONS') return sendJson(response, 204, {})

    if (request.method === 'POST' && request.url === '/api/auth/login') {
      try {
        const credentials = await readBody<{ username?: string; password?: string }>(request)
        if (!matches(credentials.username, username) || !matches(credentials.password, password)) {
          return sendJson(response, 401, { message: 'Incorrect username or password.' })
        }

        const token = randomUUID()
        sessions.set(token, { username })
        return sendJson(response, 200, { token, user: { username } })
      } catch {
        return sendJson(response, 400, { message: 'Invalid login request.' })
      }
    }

    if (request.method === 'POST' && request.url === '/api/auth/logout') {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
      if (token) sessions.delete(token)
      return sendJson(response, 204, {})
    }

    if (request.url === '/api/personnel' && (request.method === 'GET' || request.method === 'POST')) {
      if (!authenticated(request)) return sendJson(response, 401, { message: 'Please sign in to access personnel records.' })
      try {
        if (request.method === 'GET') {
          const result = await database.query(`SELECT ${personnelColumns} FROM personnel ORDER BY name`)
          return sendJson(response, 200, result.rows)
        }

        const person = await readBody<Personnel>(request)
        if (!person.id?.trim() || !person.name?.trim() || !person.division || !person.unit || !['Regular', 'Contract of Service'].includes(person.employmentType)) {
          return sendJson(response, 400, { message: 'ID, name, division, unit, and a valid employment type are required.' })
        }
        const personId = person.id.trim()
        const saved = { ...person, id: personId, name: person.name.trim() }
        const result = await database.query({
          text: `INSERT INTO personnel (
            id_no, name, position, assignment, birthdate, salary_grade, date_of_entry,
            eligibility, fund_source, tin_no, sss_no, philhealth_no, gsis_no,
            email, contact, address, sex, employment_type, unit, division, personnel_unit
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          ) RETURNING ${personnelColumns}`,
          values: [
            saved.id, saved.name, saved.position || null, saved.assignment || null,
            toSqlDate(saved.birthdate), saved.sg ? Number(saved.sg) : null,
            toSqlDate(saved.dateOfEntry), saved.eligibility || null, saved.fundSource || null,
            saved.tinNo || null, saved.sssNo || null, saved.philhealthNo || null,
            saved.gsisNo || null, saved.email || null, saved.contact || null, saved.address?.trim() || null,
            saved.sex || null, saved.employmentType, saved.division, saved.division, saved.unit,
          ],
        })
        return sendJson(response, 201, result.rows[0])
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          return sendJson(response, 409, { message: 'A personnel record with this ID already exists.' })
        }
        console.error('Personnel database request failed:', error)
        return sendJson(response, 400, { message: 'Unable to process personnel request.' })
      }
    }

    return sendJson(response, 404, { message: 'Not found.' })
  }).listen(port, () => {
    console.log(`Authentication server listening at http://localhost:${port}`)
  })
}

startServer().catch((error: unknown) => {
  console.error('Unable to initialize the personnel database:', error)
  process.exitCode = 1
})
