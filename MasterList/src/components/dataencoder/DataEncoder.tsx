import { Fragment, useMemo, useState } from 'react'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  columns,
  personnel,
  PersonnelDetails,
  tableMinWidth,
  type Personnel,
} from '../masterlist/MasterList'

const years = ['2026', '2025', '2024'] as const
const yearFilters = [
  { label: 'All Years', value: 'all' },
  ...years.map((year) => ({ label: year, value: year })),
] as const
type YearFilter = typeof yearFilters[number]['value']
const groups = ['Regular', 'Contract of Service'] as const

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()
const entryYear = (person: Personnel) => person.dateOfEntry.match(/(\d{4})$/)?.[1] ?? ''

function personMatches(person: Personnel, search: string) {
  return !search || normalize(Object.values(person).join(' ')).includes(normalize(search))
}

function YearTable({ year, people, onShow }: { year: string; people: Personnel[]; onShow: (person: Personnel) => void }) {
  return (
    <section className="mt-4 border-t border-slate-200 first:mt-0 first:border-t-0">
      <h3 className="bg-[#65bd6c] px-4 py-2 text-center text-lg font-extrabold uppercase text-white sm:text-xl">
        Hired in {year}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-[10px] uppercase text-slate-700" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            {columns.map((column) => <col key={column.key} style={{ width: column.width }} />)}
          </colgroup>
          <thead>
            <tr className="bg-[#a6d9a9] text-center text-[10px] font-extrabold leading-tight text-white">
              {columns.map((column) => <th key={column.key} className="px-2 py-2">{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const groupPeople = people.filter((person) => person.employmentType === group)

              return (
                <Fragment key={group}>
                  <tr>
                    <td colSpan={columns.length} className="bg-[#e4f3e5] px-2 py-2 text-left text-sm font-extrabold text-slate-900">{group}</td>
                  </tr>
                  {groupPeople.length > 0 ? groupPeople.map((person) => (
                    <tr key={person.id} className="border-b border-slate-100 hover:bg-green-50">
                      {columns.map((column) => (
                        <td key={column.key} className="break-words px-2 py-2 text-center align-middle">
                          {column.key === 'action' ? (
                            <button
                              type="button"
                              onClick={() => onShow(person)}
                              aria-label={`Show details for ${person.name}`}
                              className="cursor-pointer rounded-md bg-[#17652a] px-3 py-1 text-[10px] font-bold uppercase text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                            >
                              Show
                            </button>
                          ) : person[column.key]}
                        </td>
                      ))}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={columns.length} className="px-2 py-3 text-center text-[10px] normal-case text-slate-500">No personnel found in this category.</td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-green-100 bg-green-50 px-4 py-2 text-xs font-bold text-slate-800">Number of Personnel Hired in {year}: {people.length}</div>
    </section>
  )
}

function YearCard({ year, people, onShow }: { year: string; people: Personnel[]; onShow: (person: Personnel) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <h2 className="bg-[#17652a] px-4 py-2 text-center text-2xl font-extrabold uppercase text-white sm:text-3xl">{year}</h2>
      <YearTable year={year} people={people} onShow={onShow} />
    </div>
  )
}

export function YearGroupedPersonnelPage({ title }: { title: string }) {
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState<YearFilter>('all')
  const [selected, setSelected] = useState<Personnel | null>(null)
  const yearSections = useMemo(
    () => years
      .filter((year) => selectedYear === 'all' || selectedYear === year)
      .map((year) => ({ year, people: personnel.filter((person) => entryYear(person) === year && personMatches(person, search)) })),
    [search, selectedYear],
  )
  const totalPersonnel = yearSections.reduce((total, section) => total + section.people.length, 0)

  return (
    <section className="mx-auto max-w-[1600px]">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="text-xs font-medium uppercase text-slate-600">Personnel grouped by year of entry</p>
        </div>
        <label className="relative flex w-full sm:w-96">
          <span className="sr-only">Search personnel</span>
          <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') setSearch('') }}
            placeholder="Search name, unit, position..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-xs text-slate-900 shadow-md outline-none placeholder:text-slate-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>
      </header>

      <nav className="mb-7 flex gap-2 overflow-x-auto pb-1" aria-label="Filter data encoder by year hired">
        {yearFilters.map((filter) => {
          const isActive = selectedYear === filter.value

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedYear(filter.value)}
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

      <div className="flex flex-col gap-10">
        {yearSections.map((section) => <YearCard key={section.year} {...section} onShow={setSelected} />)}
        <footer className="flex justify-end rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-900 shadow-lg">Total Personnel: {totalPersonnel}</footer>
      </div>
      {selected && <PersonnelDetails person={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

export default function DataEncoder() {
  return <YearGroupedPersonnelPage title="Data Encoder" />
}
