'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  disabled?: boolean
  error?: boolean
}

export default function TimePicker({ value, onChange, disabled, error }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(12)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [isPM, setIsPM] = useState(false)
  const [isSelectingMinutes, setIsSelectingMinutes] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Parse the time value when it changes
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number)
      setSelectedHour(hours === 0 ? 12 : hours > 12 ? hours - 12 : hours)
      setSelectedMinute(minutes || 0)
      setIsPM(hours >= 12)
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const updateTime = useCallback((hour?: number, minute?: number, isAfternoon?: boolean) => {
    const finalHour = hour ?? selectedHour
    const finalMinute = minute ?? selectedMinute
    const finalIsPM = isAfternoon ?? isPM
    
    const hour24 = finalIsPM ? (finalHour === 12 ? 12 : finalHour + 12) : (finalHour === 12 ? 0 : finalHour)
    const timeString = `${hour24.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`
    onChange(timeString)
  }, [selectedHour, selectedMinute, isPM, onChange])

  const formatDisplayTime = () => {
    if (!value) return '--:--'
    const [hours, minutes] = value.split(':').map(Number)
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    const period = hours >= 12 ? 'PM' : 'AM'
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const incrementHour = () => {
    const newHour = selectedHour === 12 ? 1 : selectedHour + 1
    setSelectedHour(newHour)
    updateTime(newHour, selectedMinute, isPM)
  }

  const decrementHour = () => {
    const newHour = selectedHour === 1 ? 12 : selectedHour - 1
    setSelectedHour(newHour)
    updateTime(newHour, selectedMinute, isPM)
  }

  const incrementMinute = () => {
    const newMinute = selectedMinute === 59 ? 0 : selectedMinute + 1
    setSelectedMinute(newMinute)
    updateTime(selectedHour, newMinute, isPM)
  }

  const decrementMinute = () => {
    const newMinute = selectedMinute === 0 ? 59 : selectedMinute - 1
    setSelectedMinute(newMinute)
    updateTime(selectedHour, newMinute, isPM)
  }

  const handleHourClick = (hour: number) => {
    if (!isSelectingMinutes) {
      // First click: select hour and switch to minute selection mode
      setSelectedHour(hour)
      setIsSelectingMinutes(true)
      updateTime(hour, selectedMinute, isPM)
    } else {
      // Second click: set minutes based on hour position (each hour = 5 minutes)
      const minutes = (hour === 12 ? 0 : hour) * 5
      setSelectedMinute(minutes)
      updateTime(selectedHour, minutes, isPM)
    }
  }

  // Generate clock face positions for numbers (always at radius 60)
  const getClockPosition = (number: number, isHour: boolean) => {
    const angle = isHour 
      ? ((number === 12 ? 0 : number) * 30) - 90  // Hours: 30 degrees per hour
      : (number * 6) - 90 // Minutes: 6 degrees per minute
    const radius = 60  // Numbers always at same radius
    const x = 80 + radius * Math.cos((angle * Math.PI) / 180)
    const y = 80 + radius * Math.sin((angle * Math.PI) / 180)
    return { x, y }
  }

  // Generate hand positions (different radii for hour vs minute hands)
  const getHandPosition = (number: number, isHour: boolean) => {
    const angle = isHour 
      ? ((number === 12 ? 0 : number) * 30) - 90  // Hours: 30 degrees per hour
      : (number * 6) - 90 // Minutes: 6 degrees per minute
    const radius = isHour ? 40 : 55  // Shorter hour hand, longer minute hand
    const x = 80 + radius * Math.cos((angle * Math.PI) / 180)
    const y = 80 + radius * Math.sin((angle * Math.PI) / 180)
    return { x, y }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Field */}
      <div 
        onClick={() => {
          if (!disabled) {
            if (!isOpen) {
              setIsOpen(true)
              setIsSelectingMinutes(false) // Reset to hour selection mode
            } else {
              setIsOpen(false)
            }
          }
        }}
        className={`relative cursor-pointer`}
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <input 
          type="text"
          value={formatDisplayTime()}
          readOnly
          data-testid="time-picker-input"
          className={`w-full pl-10 pr-10 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 cursor-pointer ${
            error 
              ? 'border-red-300 bg-red-50 focus:ring-red-500' 
              : 'border-gray-300 bg-white hover:border-gray-400'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          disabled={disabled}
          placeholder="Seleccionar hora"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Time Picker Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-6 w-full max-w-md">
          {/* Clock and Controls Section */}
          <div className="flex items-start space-x-6 mb-2">
            {/* Clock Face */}
            <div className="flex-shrink-0">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  {/* Outer circle */}
                  <circle cx="80" cy="80" r="75" fill="none" stroke="#E5E7EB" strokeWidth="2" />
                  
                  {/* Hour hand (drawn first, so it appears behind the numbers) */}
                  <line 
                    x1="80" 
                    y1="80" 
                    x2={getHandPosition(selectedHour, true).x}
                    y2={getHandPosition(selectedHour, true).y}
                    stroke="#6366F1" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />

                  {/* Minute hand (thinner, longer) - only show when selecting minutes */}
                  {isSelectingMinutes && (
                    <line 
                      x1="80" 
                      y1="80" 
                      x2={getHandPosition(selectedMinute, false).x}
                      y2={getHandPosition(selectedMinute, false).y}
                      stroke="#6366F1" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  )}

                  {/* Hour markers */}
                  {[...Array(12)].map((_, i) => {
                    const hour = i + 1
                    const { x, y } = getClockPosition(hour, true)
                    
                    // Determine if this position should be highlighted
                    const isSelected = isSelectingMinutes 
                      ? ((hour === 12 ? 0 : hour) * 5) === selectedMinute  // In minute mode, check if this position matches selected minutes
                      : hour === selectedHour  // In hour mode, check if this matches selected hour
                    
                    return (
                      <g key={hour}>
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="12" 
                          fill={isSelected ? '#6366F1' : 'transparent'}
                          stroke="none"
                          className="cursor-pointer"
                          onClick={() => handleHourClick(hour)}
                        />
                        <text 
                          x={x} 
                          y={y} 
                          textAnchor="middle" 
                          dominantBaseline="central"
                          fontSize="12" 
                          fill={isSelected ? 'white' : '#374151'}
                          className="cursor-pointer select-none"
                          onClick={() => handleHourClick(hour)}
                        >
                          {isSelectingMinutes ? ((hour === 12 ? 0 : hour) * 5).toString().padStart(2, '0') : hour}
                        </text>
                      </g>
                    )
                  })}


                  {/* Center dot (drawn last to appear on top) */}
                  <circle cx="80" cy="80" r="3" fill="#6366F1" />
                </svg>
              </div>
            </div>

            {/* Time Controls */}
            <div className="flex flex-col space-y-6 min-w-0 flex-1">
              {/* Hour Controls */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    data-testid="hour-decrement"
                    onClick={() => {
                      setIsSelectingMinutes(false) // Switch to hour selection mode
                      decrementHour()
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                    </svg>
                  </button>
                  <div 
                    className="w-12 text-center text-lg font-medium cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={() => setIsSelectingMinutes(false)} // Switch to hour selection mode
                  >
                    {selectedHour}
                  </div>
                  <button
                    type="button"
                    data-testid="hour-increment"
                    onClick={() => {
                      setIsSelectingMinutes(false) // Switch to hour selection mode
                      incrementHour()
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Minute Controls */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">Minutos</label>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    data-testid="minute-decrement"
                    onClick={() => {
                      setIsSelectingMinutes(true) // Switch to minute selection mode
                      decrementMinute()
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                    </svg>
                  </button>
                  <div 
                    className="w-12 text-center text-lg font-medium cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={() => setIsSelectingMinutes(true)} // Switch to minute selection mode
                  >
                    {selectedMinute.toString().padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    data-testid="minute-increment"
                    onClick={() => {
                      setIsSelectingMinutes(true) // Switch to minute selection mode
                      incrementMinute()
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AM/PM Toggle */}
          <div className="flex justify-end">
            <div className="flex rounded-lg bg-gray-100 p-1 w-32">
              <button
                type="button"
                onClick={() => {
                  setIsPM(false)
                  updateTime(selectedHour, selectedMinute, false)
                  setIsOpen(false)
                }}
                className={`flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  !isPM ? 'bg-white text-purple-600 shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPM(true)
                  updateTime(selectedHour, selectedMinute, true)
                  setIsOpen(false)
                }}
                className={`flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  isPM ? 'bg-white text-purple-600 shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}