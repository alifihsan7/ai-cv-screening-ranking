import React, { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  badge?: string
  badgeClassName?: string
  description?: string
  labelClassName?: string
  colorClassName?: string
  dotClassName?: string
  containerClassName?: string
}

export interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  className?: string
  buttonClassName?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  ariaLabel?: string
  id?: string
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  label,
  className = '',
  buttonClassName = '',
  size = 'md',
  disabled = false,
  ariaLabel,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const selectId = id || generatedId

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value)
      setFocusedIndex(idx >= 0 ? idx : 0)
    }
  }, [isOpen, options, value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen) {
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            onChange(options[focusedIndex].value)
            setIsOpen(false)
            buttonRef.current?.focus()
          }
        } else {
          setIsOpen(true)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        buttonRef.current?.focus()
        break
      case 'Tab':
        if (isOpen) {
          setIsOpen(false)
        }
        break
      default:
        break
    }
  }

  const isSmall = size === 'sm'

  return (
    <div className={`relative ${isOpen ? 'z-30' : ''} ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-[#13221C] mb-1.5"
        >
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full border flex items-center justify-between transition-all duration-150 cursor-pointer select-none shadow-tactile-sm hover:border-[#1B4938]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
          selectedOption?.containerClassName || 'bg-[#FCFDFC] border-[#D5DFD9]'
        } ${
          isSmall ? 'h-8 px-2.5 text-xs rounded-lg' : 'h-10 px-3.5 text-sm font-medium rounded-xl'
        } ${isOpen ? 'border-[#1B4938] ring-2 ring-[#1B4938]/15' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center space-x-1.5 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-[#1B4938]">{selectedOption.icon}</span>
          )}
          {selectedOption?.dotClassName && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotClassName}`} />
          )}
          <span
            title={selectedOption ? selectedOption.label : placeholder}
            className={`truncate block min-w-0 ${
              !selectedOption
                ? 'text-[#2D4439]/60'
                : selectedOption.labelClassName ||
                  selectedOption.colorClassName ||
                  'font-semibold text-[#13221C]'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold tabular-nums shrink-0 ${
                selectedOption.badgeClassName || 'bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9]'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#2D4439] transition-transform duration-150 shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 left-0 min-w-full w-max max-w-[320px] mt-1.5 max-h-60 overflow-y-auto bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl p-1 shadow-tactile-lg space-y-0.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            const isFocused = idx === focusedIndex
            const labelColor =
              opt.labelClassName ||
              opt.colorClassName ||
              (isSelected ? 'text-[#124B2E] font-bold' : 'text-[#13221C]')

            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                  buttonRef.current?.focus()
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm cursor-pointer flex items-center justify-between transition-colors select-none border gap-2 ${
                  isSelected
                    ? opt.containerClassName
                      ? `${opt.containerClassName} ${labelColor}`
                      : 'bg-[#EBF6EF] border-[#BBE5CD] text-[#124B2E] font-bold'
                    : isFocused
                    ? 'bg-[#EBF1EE] border-transparent text-[#13221C] font-semibold'
                    : 'border-transparent text-[#13221C] hover:bg-[#F2F5F3]'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  {opt.dotClassName && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClassName}`} />
                  )}
                  <div>
                    <span className={`block whitespace-nowrap ${labelColor}`} title={opt.label}>
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="block text-[11px] font-normal text-[#2D4439] mt-0.5">
                        {opt.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  {opt.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold tabular-nums shrink-0 ${
                        opt.badgeClassName || 'bg-[#FCFDFC] text-[#2D4439] border border-[#D5DFD9]'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check
                      className={`w-4 h-4 shrink-0 ${
                        opt.labelClassName || opt.colorClassName
                          ? 'text-current'
                          : 'text-[#124B2E]'
                      }`}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
