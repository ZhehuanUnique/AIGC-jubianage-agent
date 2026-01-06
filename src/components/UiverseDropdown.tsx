import { useState, useRef, useEffect } from 'react'

interface UiverseDropdownProps {
  label: string
  options: Array<{ value: string; label: string }>
  selectedValue: string
  onSelect: (value: string) => void
  isActive?: boolean
}

function UiverseDropdown({ label, options, selectedValue, onSelect, isActive = false }: UiverseDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || label

  return (
    <div className="uiverse-menu" ref={menuRef}>
      <div className={`uiverse-menu-item ${isOpen ? 'uiverse-menu-item-open' : ''}`}>
        <a
          href="#"
          className="uiverse-menu-link"
          onClick={(e) => {
            e.preventDefault()
            setIsOpen(!isOpen)
          }}
        >
          <span>{selectedLabel}</span>
          <svg viewBox="0 0 360 360" xmlSpace="preserve">
            <g id="SVGRepo_iconCarrier">
              <path
                id="XMLID_225_"
                d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393 c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393 s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"
              ></path>
            </g>
          </svg>
        </a>
        <div className={`uiverse-submenu ${isOpen ? 'uiverse-submenu-open' : ''}`}>
          {options.map((option) => (
            <div key={option.value} className="uiverse-submenu-item">
              <a
                href="#"
                className="uiverse-submenu-link"
                onClick={(e) => {
                  e.preventDefault()
                  onSelect(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UiverseDropdown

