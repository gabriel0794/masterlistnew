import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/* ───────────────────────────── Types ───────────────────────────── */

export type Personnel = {
  id: string
  name: string
  position: string
  assignment: string
  birthdate: string
  sg: string
  dateOfEntry: string
  eligibility: string
  fundSource: string
  tinNo?: string
  sssNo?: string
  philhealthNo?: string
  gsisNo?: string
  email: string
  contact: string
  sex: string
  unit: string
  employmentType: 'Regular' | 'Contract of Service'
}

type UnitSection = { unit: string; people: Personnel[] }
type DivisionSection = { title: string; units: UnitSection[]; total: number }
type ShowHandler = (person: Personnel) => void

/* ─────────────── Static data (replace with DB fetch later) ─────────────── */

const directorUnits = [
  'OFFICE OF THE REGIONAL DIRECTOR',
  'OFFICE OF THE ASSISTANT REGIONAL DIRECTOR',
  'HEALTH FACILITY DEVELOPMENT CLUSTER',
  'RESEARCH EPIDEMIOLOGY, SURVEILLANCE & DISASTER RESPONSE UNIT',
  'DISEASE SURVEILLANCE OFFICER',
  'INFORMATION, COMMUNICATIONS AND TECHNOLOGY UNIT',
  'HEALTH EDUCATION AND PROMOTION UNIT',
  'COMMUNICATIONS MANAGEMENT UNIT',
  'LEGAL UNIT / PACD',
  'REGIONAL BLOOD CENTER',
  'HEALTH SYSTEM RESILIENCE PROJECT (HSRP)',
]

const managementUnits = [
  'OFFICE OF THE CHIEF ADMINISTRATIVE OFFICER',
  'PROCUREMENT UNIT',
  'PLANNING AND STATISTICS UNIT',
  'HUMAN RESOURCE DEVELOPMENT UNIT',
  'ACCOUNTING SECTION',
  'BUDGET SECTION',
  'CASHIER SECTION',
  'PERSONNEL SECTION',
  'RECORDS SECTION',
  'SUPPLY SECTION',
  'GENERAL SERVICES UNIT / TRANSPORT SECTION',
]

const localHealthSupportUnits = [
  'OFFICE OF THE LHSD CHIEF',
  'FAMILY HEALTH CLUSTER',
  'LOCAL HEALTH SYSTEMS DEVELOPMENT CLUSTER',
  'NON-COMMUNICABLE DISEASE CLUSTER',
  'INFECTIOUS DISEASE CLUSTER',
  'ENVIRONMENTAL AND OCCUPATIONAL HEALTH CLUSTER',
]

const regulationsLicensingUnits = [
  'OFFICE OF THE RLED CHIEF',
  'HOSPITAL LICENSING SECTION',
  'OTHER HEALTH FACILITY LICENSING SECTION',
]

const provincialHealthOfficeUnits = [
  'PDOHO - BUKIDNON',
  'PDOHO - CAMIGUIN',
  'PDOHO - LANAO DEL NORTE',
  'PDOHO - MISAMIS OCCIDENTAL',
  'PDOHO - MISAMIS ORIENTAL',
  'CDOHO - CAGAYAN DE ORO',
  'CDOHO - ILIGAN',
]

const divisions = [
  { title: 'Office of the Director', units: directorUnits },
  { title: 'Management Support Division', units: managementUnits },
  { title: 'Local Health Support Division', units: localHealthSupportUnits },
  { title: 'Regulations, Licensing and Enforcement Division', units: regulationsLicensingUnits },
  { title: 'Provincial Department of Health Office', units: provincialHealthOfficeUnits },
]

const headUnitFilters = [
  { label: 'All Head Units', value: 'all' },
  { label: 'Office of the Director', value: 'Office of the Director' },
  { label: 'Management Support Division', value: 'Management Support Division' },
  { label: 'Local Health Support Division', value: 'Local Health Support Division' },
  { label: 'Regulations, Licensing and Enforcement Division', value: 'Regulations, Licensing and Enforcement Division' },
  { label: 'PDOHO', value: 'Provincial Department of Health Office' },
] as const

type HeadUnitFilter = typeof headUnitFilters[number]['value']

const divisionOf = (unit: string) => divisions.find((division) => division.units.includes(unit))?.title ?? ''

export const personnel: Personnel[] = []

// Columns shown in the table. Fixed widths (px) keep the header and every row aligned.
export const columns: Array<{ key: keyof Personnel | 'action'; label: string; width: number }> = [
  { key: 'id', label: 'ID NO.', width: 90 },
  { key: 'name', label: 'NAME', width: 200 },
  { key: 'position', label: 'POSITION', width: 190 },
  { key: 'assignment', label: 'AREA OF ASSIGNMENT', width: 170 },
  { key: 'birthdate', label: 'BIRTHDATE', width: 130 },
  { key: 'sg', label: 'SG', width: 50 },
  { key: 'dateOfEntry', label: 'DATE OF ENTRY', width: 140 },
  { key: 'eligibility', label: 'ELIGIBILITY', width: 110 },
  { key: 'fundSource', label: 'FUND SOURCE', width: 100 },
  { key: 'action', label: 'DETAILS', width: 90 },
]

export const tableMinWidth = columns.reduce((sum, column) => sum + column.width, 0)

const groups = ['Contract of Service', 'Regular'] as const

/* ───────────────────────────── Search ───────────────────────────── */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

const normalize = (value: string) => value.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim()

// "NOVEMBER 24, 2002" -> also searchable as 11/24/2002, 11-24-2002, 2002-11-24 (padded and unpadded)
function dateVariants(value: string): string[] {
  const match = value.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (!match) return []

  const month = MONTHS.indexOf(match[1].toLowerCase()) + 1
  if (!month) return []

  const day = Number(match[2])
  const year = match[3]
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')

  return [
    `${mm}/${dd}/${year}`,
    `${month}/${day}/${year}`,
    `${mm}-${dd}-${year}`,
    `${month}-${day}-${year}`,
    `${year}-${mm}-${dd}`,
  ]
}

function personText(person: Personnel, divisionTitle: string) {
  return normalize(
    [
      ...Object.values(person), // every field, including the ones hidden from the table
      divisionTitle,
      ...dateVariants(person.birthdate),
      ...dateVariants(person.dateOfEntry),
    ].join(' '),
  )
}

/**
 * Every typed word must match.
 * - A unit/division name match shows that unit with ALL its personnel (even if empty).
 * - Otherwise only the personnel who match are shown, under their unit.
 * - Divisions with nothing to show are hidden.
 */
function buildSections(tokens: string[], selectedFilter: HeadUnitFilter, records: Personnel[]): DivisionSection[] {
  const matches = (text: string) => tokens.every((token) => text.includes(token))

  return divisions
    .map(({ title, units }) => {
      const divisionMatchesFilter = selectedFilter === 'all' || selectedFilter === title
      if (!divisionMatchesFilter) return { title, units: [], total: 0 }

      const unitSections = units.flatMap((unit): UnitSection[] => {
        const unitMatches = matches(normalize(`${unit} ${title}`))
        const people = records.filter(
          (person) =>
            person.unit === unit &&
            (unitMatches || matches(personText(person, title))),
        )
        if (unitMatches) return [{ unit, people }]
        return people.length > 0 ? [{ unit, people }] : []
      })

      return {
        title,
        units: unitSections,
        total: unitSections.reduce((sum, section) => sum + section.people.length, 0),
      }
    })
    .filter((division) => division.units.length > 0)
}

/* ─────────────── Details card (opens over the page) ─────────────── */

export function PersonnelDetails({ person, onClose }: { person: Personnel; onClose: () => void }) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousBodyOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const fieldGroups: Array<{ title: string; fields: Array<{ label: string; value: string; href?: string }> }> = [
    {
      title: 'Employment Details',
      fields: [
        { label: 'ID No.', value: person.id },
        { label: 'Employment Type', value: person.employmentType },
        { label: 'Position', value: person.position },
        { label: 'Salary Grade', value: person.sg },
        { label: 'Division', value: divisionOf(person.unit) },
        { label: 'Unit', value: person.unit },
        { label: 'Area of Assignment', value: person.assignment },
        { label: 'Fund Source', value: person.fundSource },
      ],
    },
    {
      title: 'Benefits and Contribution Details',
      fields: [
        { label: 'TIN No.', value: person.tinNo ?? 'N/A' },
        { label: 'SSS No.', value: person.sssNo ?? 'N/A' },
        { label: 'Philhealth No.', value: person.philhealthNo ?? 'N/A' },
        ...(person.employmentType === 'Regular'
          ? [{ label: 'GSIS No.', value: person.gsisNo ?? 'N/A' }]
          : []),
      ],
    },
    {
      title: 'Personal Details',
      fields: [
        { label: 'Date of Entry', value: person.dateOfEntry },
        { label: 'Eligibility', value: person.eligibility },
        { label: 'Birthdate', value: person.birthdate },
        { label: 'Sex', value: person.sex },
        { label: 'Email Address', value: person.email, href: `mailto:${person.email}` },
        { label: 'Contact Number', value: person.contact, href: `tel:${person.contact}` },
      ],
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="personnel-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 bg-[#17652a] px-6 py-4 text-white">
          <div>
            <h2 id="personnel-details-title" className="text-xl font-extrabold uppercase">
              {person.name}
            </h2>
            <p className="text-xs font-medium uppercase text-green-100">{person.position}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-md px-2 text-2xl leading-none text-green-100 hover:bg-white/10 hover:text-white"
          >
            &times;
          </button>
        </div>

        <dl className="grid gap-x-6 gap-y-4 px-6 py-6 sm:grid-cols-2">
          {fieldGroups.map((group) => (
            <Fragment key={group.title}>
              <div className="col-span-full border-b border-green-100 pb-2 pt-2 first:pt-0">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#17652a]">{group.title}</h3>
              </div>
              {group.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{field.label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold uppercase text-slate-900">
                    {field.href ? (
                      <a href={field.href} className="normal-case underline decoration-slate-300 underline-offset-2 hover:text-green-800">
                        {field.value}
                      </a>
                    ) : (
                      field.value
                    )}
                  </dd>
                </div>
              ))}
            </Fragment>
          ))}
        </dl>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="rounded-lg bg-[#17652a] px-5 py-2 text-xs font-bold uppercase text-white hover:bg-green-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── One unit (e.g. "Personnel Section") ─────────────── */

const allUnits = divisions.flatMap((division) => division.units)
const personnelUnitOptions = [
  'Office of the Director',
  'Management Support Division',
  'Local Health Support Division',
  'Regulations, Licensing and Enforcement Division',
  'PDOHO',
  'Data Encoder',
  'GIP',
  'OJT',
]
const sexOptions = ['Male', 'Female']

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function isValidDateInput(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false
  const [, monthText, dayText, yearText] = match
  const month = Number(monthText)
  const day = Number(dayText)
  const year = Number(yearText)
  const date = new Date(year, month - 1, day)
  return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function AddPersonnel({ onAdd, onClose }: { onAdd: (person: Personnel) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<Personnel>({
    id: '', name: '', position: '', assignment: '', birthdate: '', sg: '', dateOfEntry: '',
    eligibility: '', fundSource: '', tinNo: '', sssNo: '', philhealthNo: '', gsisNo: '',
    email: '', contact: '', sex: '', unit: allUnits[0], employmentType: 'Contract of Service',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (field: keyof Personnel, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const textFields: Array<{ key: keyof Personnel; label: string; required?: boolean }> = [
    { key: 'id', label: 'ID No.', required: true },
    { key: 'name', label: 'Name', required: true },
    { key: 'position', label: 'Position' },
    { key: 'assignment', label: 'Area of Assignment' },
    { key: 'birthdate', label: 'Birthdate' },
    { key: 'sg', label: 'Salary Grade' },
    { key: 'dateOfEntry', label: 'Date of Entry' },
    { key: 'eligibility', label: 'Eligibility' },
    { key: 'fundSource', label: 'Fund Source' },
    { key: 'tinNo', label: 'TIN No.' },
    { key: 'sssNo', label: 'SSS No.' },
    { key: 'philhealthNo', label: 'Philhealth No.' },
    { key: 'gsisNo', label: 'GSIS No. (Regular only)' },
    { key: 'email', label: 'Email Address' },
    { key: 'contact', label: 'Contact Number' },
  ]

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    for (const [label, value] of [['Birthdate', form.birthdate], ['Date of Entry', form.dateOfEntry]]) {
      if (value && !isValidDateInput(value)) {
        setError(`${label} must be a valid date in MM/DD/YYYY format.`)
        return
      }
    }
    setSaving(true)
    try {
      await onAdd({ ...form, gsisNo: form.employmentType === 'Regular' ? form.gsisNo : undefined })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save personnel.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between bg-[#17652a] px-6 py-4 text-white">
          <h2 className="text-xl font-extrabold uppercase">Add Personnel</h2>
          <button type="button" onClick={onClose} aria-label="Close add personnel form" className="rounded-md px-2 text-2xl leading-none text-green-100 hover:bg-white/10 hover:text-white">&times;</button>
        </div>
        {error && <p role="alert" className="px-6 pt-4 text-sm text-red-700">{error}</p>}
        <div className="grid gap-x-6 gap-y-4 px-6 py-6 sm:grid-cols-2">
          {textFields.map((field) => (
            <label key={field.key} className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
              {field.label}
              <input type="text" value={String(form[field.key] ?? '')} onChange={(event) => update(field.key, field.key === 'birthdate' || field.key === 'dateOfEntry' ? formatDateInput(event.target.value) : event.target.value)} required={field.required} inputMode={field.key === 'birthdate' || field.key === 'dateOfEntry' ? 'numeric' : undefined} maxLength={field.key === 'birthdate' || field.key === 'dateOfEntry' ? 10 : undefined} placeholder={field.key === 'birthdate' || field.key === 'dateOfEntry' ? 'MM/DD/YYYY' : undefined} pattern={field.key === 'birthdate' || field.key === 'dateOfEntry' ? '(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/[0-9]{4}' : undefined} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100" />
            </label>
          ))}
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Sex
            <select value={form.sex} onChange={(event) => update('sex', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100">
              <option value="">Select sex</option>
              {sexOptions.map((sex) => <option key={sex} value={sex}>{sex}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Employment Type
            <select value={form.employmentType} onChange={(event) => update('employmentType', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100">
              {groups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Unit
            <select value={form.unit} onChange={(event) => update('unit', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100">
              {personnelUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-white">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-[#17652a] px-5 py-2 text-xs font-bold uppercase text-white hover:bg-green-700 disabled:opacity-60">{saving ? 'Saving…' : 'Add Personnel'}</button>
        </div>
      </form>
    </div>
  )
}

function UnitTable({ unit, people, onShow }: UnitSection & { onShow: ShowHandler }) {
  return (
    <section className="mt-4 border-t border-slate-200 first:mt-0 first:border-t-0">
      <h3 className="bg-[#65bd6c] px-4 py-2 text-center text-lg font-extrabold uppercase text-white sm:text-xl">
        {unit}
      </h3>

      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed border-collapse text-[10px] uppercase text-slate-700"
          style={{ minWidth: tableMinWidth }}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>

          <thead>
            <tr className="bg-[#a6d9a9] text-center text-[10px] font-extrabold leading-tight text-white">
              {columns.map((column) => (
                <th key={column.key} className="px-2 py-2">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => {
              const groupPeople = people.filter((person) => person.employmentType === group)

              return (
                <Fragment key={group}>
                  <tr>
                    <td colSpan={columns.length} className="bg-[#e4f3e5] px-2 py-2 text-left text-sm font-extrabold text-slate-900">
                      {group}
                    </td>
                  </tr>

                  {groupPeople.length > 0 ? (
                    groupPeople.map((person) => (
                      <tr key={person.id} className="border-b border-slate-100 hover:bg-green-50">
                        {columns.map((column) => (
                          <td key={column.key} className="break-words px-2 py-2 text-center align-middle">
                            {column.key === 'action' ? (
                              <button
                                type="button"
                                onClick={() => onShow(person)}
                                aria-label={`Show details for ${person.name}`}
                                className="rounded-md bg-[#17652a] px-3 py-1 text-[10px] font-bold uppercase text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 cursor-pointer"
                              >
                                Show
                              </button>
                            ) : (
                              person[column.key]
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="px-2 py-3 text-center text-[10px] normal-case text-slate-500">
                        No personnel found in this category.
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-green-100 bg-green-50 px-4 py-2 text-xs font-bold text-slate-800">
        Number of Personnel in this Unit: {people.length}
      </div>
    </section>
  )
}

/* ─────────────── One division card (title + its units + total) ─────────────── */

function DivisionCard({ title, units, total, onShow }: DivisionSection & { onShow: ShowHandler }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <h2 className="bg-[#17652a] px-4 py-2 text-center text-2xl font-extrabold uppercase text-white sm:text-3xl">
        {title}
      </h2>

      {units.map((section) => (
        <UnitTable key={section.unit} {...section} onShow={onShow} />
      ))}

      <footer className="flex justify-end border-t border-green-100 bg-green-50 px-4 py-4 text-sm font-bold text-slate-900">
        Total Personnel in {title}: {total}
      </footer>
    </div>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function MasterList() {
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<HeadUnitFilter>('all')
  const [selected, setSelected] = useState<Personnel | null>(null)
  const [people, setPeople] = useState<Personnel[]>([])
  const [loadError, setLoadError] = useState('')
  const [showAddPersonnel, setShowAddPersonnel] = useState(false)

  const sections = useMemo(
    () => buildSections(normalize(search).split(' ').filter(Boolean), selectedFilter, people),
    [people, search, selectedFilter],
  )
  const totalPersonnel = sections.reduce((sum, division) => sum + division.total, 0)

  useEffect(() => {
    const token = localStorage.getItem('masterlist-auth-token')
    fetch('/api/personnel', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (response) => {
        const data = await response.json() as Personnel[] | { message?: string }
        if (!response.ok) throw new Error(!Array.isArray(data) ? data.message : 'Unable to load personnel.')
        setPeople(data as Personnel[])
        setLoadError('')
      })
      .catch((cause: unknown) => setLoadError(cause instanceof Error ? cause.message : 'Unable to load personnel.'))
  }, [])

  const addPersonnel = async (person: Personnel) => {
    const token = localStorage.getItem('masterlist-auth-token')
    const response = await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(person),
    })
    const data = await response.json() as Personnel | { message?: string }
    if (!response.ok) throw new Error('message' in data ? data.message : 'Unable to save personnel.')
    setPeople((current) => [...current, data as Personnel])
    setShowAddPersonnel(false)
  }

  return (
    <section className="mx-auto max-w-[1600px]">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-slate-950 sm:text-5xl">Master List</h1>
          <p className="text-xs font-medium uppercase text-slate-600">For all employee of DOH regular &amp; COS</p>
        </div>

        <label className="relative flex w-full sm:w-96">
          <span className="sr-only">Search personnel</span>
          <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') setSearch('') }}
            placeholder="Search name, unit, position, birthdate…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-xs text-slate-900 shadow-md outline-none placeholder:text-slate-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>
      </header>

      <div className="mb-7 flex items-center gap-4">
        <nav className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" aria-label="Filter master list by head unit">
          {headUnitFilters.map((filter) => {
            const isActive = selectedFilter === filter.value

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedFilter(filter.value)}
                aria-pressed={isActive}
                className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-green-200 ${
                  isActive
                    ? 'border-[#17652a] bg-[#17652a] text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-green-700 hover:text-green-800'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={() => setShowAddPersonnel(true)}
          className="shrink-0 rounded-xl bg-[#17652a] px-5 py-2.5 text-xs font-bold uppercase text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-200"
        >
          + Add Personnel
        </button>
      </div>

      <div className="flex flex-col gap-10">
        {loadError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
        {sections.length > 0 ? (
          sections.map((division) => <DivisionCard key={division.title} {...division} onShow={setSelected} />)
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-lg">
            No personnel match your search.
          </div>
        )}

        <footer className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-4 text-xs text-slate-700 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <span>As of October 14, 2026 (this should be updated daily or weekly)</span>
          <strong className="text-sm text-slate-900">Total Personnel: {totalPersonnel}</strong>
        </footer>
      </div>

      {selected && <PersonnelDetails person={selected} onClose={() => setSelected(null)} />}
      {showAddPersonnel && (
        <AddPersonnel
          onAdd={addPersonnel}
          onClose={() => setShowAddPersonnel(false)}
        />
      )}
    </section>
  )
}
