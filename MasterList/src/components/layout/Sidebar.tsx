
export interface SidebarItem {
  id: string
  label: string
}

interface SidebarProps {
  items?: SidebarItem[]
  activeId: string
  onSelect: (id: string) => void
  onLogout: () => void | Promise<void>
}


const defaultItems: SidebarItem[] = [
  { id: 'masterlist', label: 'Master List'},
  { id: 'dataencoder', label: 'Data Encoder' },
  { id: 'gip', label: 'GIP' },
  { id: 'ojt', label: 'OJT'},
]

export default function Sidebar({
  items = defaultItems,
  activeId,
  onSelect,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-green-800 text-slate-50">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-500 text-sm font-bold text-white">
          DOH
        </span>
        <span className="text-lg font-semibold text-slate-white">DOH CDH-NM</span>
      </div>

      <div className="border-b border-white/20 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3">
          <span className="grid size-9 place-items-center rounded-full bg-green-500 text-white">
            <FontAwesomeIcon icon={faUser} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-green-100">Signed in as</p>
            <p className="truncate text-sm font-bold text-white">personnel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-green-500'
                  : 'text-white hover:bg-slate-100 hover:text-green-500'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-white/20 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-200"
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4" />
          Logout
        </button>
        <p className="mt-3 text-xs text-green-100">All rights reserved. &copy; 2026</p>
      </div>
    </aside>
  )
}   
import { faArrowRightFromBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
