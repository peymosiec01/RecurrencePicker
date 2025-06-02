import * as React from 'react';

export interface IRecurrenceData {
    startDate: string;
    pattern: string;
    every: number;
    selectedDays: string[];
    monthlyOption: string;
    yearlyOption: string;
    endDate: string | null;
    hasEndDate: boolean;
}

interface IRecurrencePickerProps {
    isVisible: boolean;
    initialData: IRecurrenceData | null;
    onSet: (data: IRecurrenceData) => void;
    onCancel: () => void;
    onToggleVisibility: () => void;
}

interface IDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const DatePicker: React.FC<IDatePickerProps> = ({ value, onChange, placeholder = "Select date" }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState(value || "");
    const pickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateString: string): string => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB');
        } catch {
            return dateString;
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = e.target.value;
        const formattedDate = formatDate(selectedDate);
        setDisplayValue(formattedDate);
        onChange(formattedDate);
        setIsOpen(false);
    };

    const convertToInputFormat = (displayDate: string): string => {
        if (!displayDate) return "";
        try {
            const parts = displayDate.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        } catch {
            return "";
        }
        return "";
    };

    const handleTextClick = () => {
        setIsOpen(!isOpen);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDisplayValue(e.target.value);
    };

    const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const formattedDate = formatDate(e.target.value);
        setDisplayValue(formattedDate);
        onChange(formattedDate);
    };

    return (
        <div 
            className="recurrence-date-picker" 
            ref={pickerRef}
            style={{ display: 'inline-block' }} // Add this line
        >
            <input
                type="text"
                value={displayValue}
                onChange={handleTextChange}
                onBlur={handleTextBlur}
                onClick={handleTextClick}
                placeholder={placeholder}
                className="recurrence-date-input recurrence-date-text-like"
                style={{
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '8px 0',
                    fontSize: '14px',
                    color: '#374151',
                    textDecoration: 'underline',
                    textDecorationColor: 'transparent',
                    transition: 'text-decoration-color 0.2s',
                    display: 'inline' // Add this line
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.textDecorationColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.textDecorationColor = 'transparent';
                }}
                onFocus={(e) => {
                    e.currentTarget.style.textDecorationColor = '#3b82f6';
                }}
            />

            {isOpen && (
                <div className="recurrence-date-dropdown">
                    <input
                        type="date"
                        value={convertToInputFormat(displayValue)}
                        onChange={handleDateChange}
                        className="recurrence-date-native"
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
};

const RecurrencePicker: React.FC<{
    onSet: (data: IRecurrenceData) => void;
    onCancel: () => void;
    initialData?: IRecurrenceData;
}> = ({ onSet, onCancel, initialData = {} as IRecurrenceData }) => {
    const [startDate, setStartDate] = React.useState(initialData?.startDate || getCurrentDate());
    const [recurrencePattern, setRecurrencePattern] = React.useState(initialData?.pattern || "day");
    const [everyValue, setEveryValue] = React.useState(initialData?.every || 1);
    const [selectedDays, setSelectedDays] = React.useState<string[]>(initialData?.selectedDays || []);
    const [monthlyOption, setMonthlyOption] = React.useState(initialData?.monthlyOption || "day");
    const [yearlyOption, setYearlyOption] = React.useState(initialData?.yearlyOption || "date");
    const [endDate, setEndDate] = React.useState(initialData?.endDate || getDefaultEndDate());
    const [hasEndDate, setHasEndDate] = React.useState(initialData?.hasEndDate !== false);

    function getCurrentDate(): string {
        const today = new Date();
        return today.toLocaleDateString('en-GB');
    }

    function getDefaultEndDate(): string {
        const date = new Date();
        date.setMonth(date.getMonth() + 3); // 3 months from now
        return date.toLocaleDateString('en-GB');
    }

    // Helper function to parse date string and get date components
    const getDateComponents = (dateStr: string) => {
        try {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return {
                    date,
                    dayOfMonth: parseInt(day),
                    monthName: date.toLocaleDateString('en-US', { month: 'long' }),
                    dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
                    weekOfMonth: getWeekOfMonth(date),
                    isLastWeekOfMonth: isLastWeekOfMonth(date)
                };
            }
            return null;
        } catch {
            return null;
        }
    };

    // Helper function to get week of month (1st, 2nd, 3rd, 4th, or last)
    const getWeekOfMonth = (date: Date): string => {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const weekNumber = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
        
        const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
        return ordinals[weekNumber - 1] || '5th';
    };

    // Helper function to check if date is in the last week of the month
    const isLastWeekOfMonth = (date: Date): boolean => {
        const nextWeek = new Date(date);
        nextWeek.setDate(date.getDate() + 7);
        return nextWeek.getMonth() !== date.getMonth();
    };

    // Get dynamic monthly options based on start date
    const getMonthlyOptions = () => {
        const components = getDateComponents(startDate);
        if (!components) return { dayOption: "On day 1", weekdayOption: "On the 1st Monday" };

        const { dayOfMonth, dayName, weekOfMonth, isLastWeekOfMonth } = components;
        
        const dayOption = `On day ${dayOfMonth}`;
        const weekdayOption = isLastWeekOfMonth 
            ? `On the last ${dayName}`
            : `On the ${weekOfMonth} ${dayName}`;

        return { dayOption, weekdayOption };
    };

    // Get dynamic yearly options based on start date
    const getYearlyOptions = () => {
        const components = getDateComponents(startDate);
        if (!components) return { dateOption: "On January 1", weekdayOption: "On the 1st Monday of January" };

        const { dayOfMonth, monthName, dayName, weekOfMonth, isLastWeekOfMonth } = components;
        
        const dateOption = `On ${monthName} ${dayOfMonth}`;
        const weekdayOption = isLastWeekOfMonth 
            ? `On the last ${dayName} of ${monthName}`
            : `On the ${weekOfMonth} ${dayName} of ${monthName}`;

        return { dateOption, weekdayOption };
    };

    const dayButtons = [
        { key: "M", label: "M", fullName: "Monday" },
        { key: "T", label: "T", fullName: "Tuesday" },
        { key: "W", label: "W", fullName: "Wednesday" },
        { key: "Th", label: "T", fullName: "Thursday" },
        { key: "F", label: "F", fullName: "Friday" },
        { key: "S", label: "S", fullName: "Saturday" },
        { key: "Su", label: "S", fullName: "Sunday" }
    ];

    const toggleDay = (day: string) => {
        setSelectedDays(prev => {
            const newSelectedDays = prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day];

            // If all days are selected, switch to daily pattern
            if (newSelectedDays.length === 7) {
                setRecurrencePattern("day");
                setEveryValue(1);
                return [];
            }

            return newSelectedDays;
        });
    };

    const getRecurrenceText = (): string => {
        const components = getDateComponents(startDate);
        if (!components) return hasEndDate ? "Occurs until" : "Occurs";

        const { dayOfMonth, monthName, dayName, isLastWeekOfMonth, weekOfMonth } = components;

        switch (recurrencePattern) {
            case "day":
                return hasEndDate ? "Occurs every day until" : "Occurs every day";
            case "week": {
                if (selectedDays.length === 0) return hasEndDate ? "Occurs every week until" : "Occurs every week";
                const dayNames = selectedDays.map(day => {
                    const dayObj = dayButtons.find(d => d.key === day);
                    return dayObj?.fullName || day;
                });
                const dayText = dayNames.length === 1
                    ? dayNames[0]
                    : dayNames.length === 2
                        ? `${dayNames[0]} and ${dayNames[1]}`
                        : `${dayNames.slice(0, -1).join(', ')} and ${dayNames[dayNames.length - 1]}`;

                return hasEndDate ? `Occurs every ${dayText} until` : `Occurs every ${dayText}`;
            }
            case "month": {
                if (monthlyOption === "day") {
                    return hasEndDate ? `Occurs on day ${dayOfMonth} until` : `Occurs on day ${dayOfMonth}`;
                } else {
                    const weekdayText = isLastWeekOfMonth 
                        ? `the last ${dayName}` 
                        : `the ${weekOfMonth} ${dayName}`;
                    return hasEndDate ? `Occurs on ${weekdayText} until` : `Occurs on ${weekdayText}`;
                }
            }
            case "year": {
                if (yearlyOption === "date") {
                    return hasEndDate ? `Occurs every ${monthName} ${dayOfMonth} until` : `Occurs every ${monthName} ${dayOfMonth}`;
                } else {
                    const weekdayText = isLastWeekOfMonth 
                        ? `the last ${dayName} of ${monthName}` 
                        : `the ${weekOfMonth} ${dayName} of ${monthName}`;
                    return hasEndDate ? `Occurs on ${weekdayText} until` : `Occurs on ${weekdayText}`;
                }
            }
            default:
                return hasEndDate ? "Occurs until" : "Occurs";
        }
    };

    const handleSave = () => {
        const recurrenceData: IRecurrenceData = {
            startDate,
            pattern: recurrencePattern,
            every: everyValue,
            selectedDays,
            monthlyOption,
            yearlyOption,
            endDate: hasEndDate ? endDate : null,
            hasEndDate
        };

        onSet(recurrenceData);
    };

    // Get the dynamic options
    const monthlyOptions = getMonthlyOptions();
    const yearlyOptions = getYearlyOptions();

    return (
        <div className="recurrence-modal-overlay">
            <div className="recurrence-modal">
                {/* Header */}
                <div className="recurrence-modal-header">
                    <h2 className="recurrence-modal-title">Repeat</h2>
                    <button
                        onClick={onCancel}
                        className="recurrence-close-button"
                        type="button"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="recurrence-modal-content">
                    {/* Start Date Row */}
                    <div className="recurrence-form-row">
                        <label className="recurrence-repeat-label">
                            <span className="recurrence-form-label">Start task on</span>
                        </label>
                        <DatePicker
                            value={startDate}
                            onChange={setStartDate}
                            placeholder="DD/MM/YYYY"
                        />
                    </div>

                    {/* Repeat Pattern Row */}
                    <div className="recurrence-form-row">
                        <div className="recurrence-repeat-label">
                            <span className="recurrence-form-label">Repeat every</span>
                        </div>
                        <div className="recurrence-input-group">
                            <input
                                type="number"
                                value={everyValue}
                                onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 1;
                                    setEveryValue(newValue);
                                }}
                                min="1"
                                className="recurrence-number-input"
                            />
                            <select
                                value={recurrencePattern}
                                onChange={(e) => setRecurrencePattern(e.target.value)}
                                className="recurrence-select"
                            >
                                <option value="day">day</option>
                                <option value="week">week</option>
                                <option value="month">month</option>
                                <option value="year">year</option>
                            </select>
                        </div>
                    </div>

                    {/* Weekly Days */}
                    {recurrencePattern === "week" && (
                        <div className="recurrence-days-grid">
                            {dayButtons.map((day) => (
                                <button
                                    key={day.key}
                                    onClick={() => toggleDay(day.key)}
                                    className={`recurrence-day-button ${selectedDays.includes(day.key)
                                            ? 'recurrence-day-button-selected'
                                            : 'recurrence-day-button-unselected'
                                        }`}
                                    type="button"
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Daily pattern shows all days selected */}
                    {recurrencePattern === "day" && (
                        <div className="recurrence-days-grid">
                            {dayButtons.map((day) => (
                                <button
                                    key={day.key}
                                    className="recurrence-day-button recurrence-day-button-selected"
                                    disabled
                                    type="button"
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Monthly Options - Now Dynamic */}
                    {recurrencePattern === "month" && (
                        <div className="recurrence-radio-group">
                            <label className="recurrence-radio-option">
                                <input
                                    type="radio"
                                    name="monthlyOption"
                                    value="day"
                                    checked={monthlyOption === "day"}
                                    onChange={(e) => setMonthlyOption(e.target.value)}
                                    className="recurrence-radio-input"
                                />
                                <span className="recurrence-radio-label">{monthlyOptions.dayOption}</span>
                            </label>
                            <label className="recurrence-radio-option">
                                <input
                                    type="radio"
                                    name="monthlyOption"
                                    value="weekday"
                                    checked={monthlyOption === "weekday"}
                                    onChange={(e) => setMonthlyOption(e.target.value)}
                                    className="recurrence-radio-input"
                                />
                                <span className="recurrence-radio-label">{monthlyOptions.weekdayOption}</span>
                            </label>
                        </div>
                    )}

                    {/* Yearly Options - Now Dynamic */}
                    {recurrencePattern === "year" && (
                        <div className="recurrence-radio-group">
                            <label className="recurrence-radio-option">
                                <input
                                    type="radio"
                                    name="yearlyOption"
                                    value="date"
                                    checked={yearlyOption === "date"}
                                    onChange={(e) => setYearlyOption(e.target.value)}
                                    className="recurrence-radio-input"
                                />
                                <span className="recurrence-radio-label">{yearlyOptions.dateOption}</span>
                            </label>
                            <label className="recurrence-radio-option">
                                <input
                                    type="radio"
                                    name="yearlyOption"
                                    value="weekday"
                                    checked={yearlyOption === "weekday"}
                                    onChange={(e) => setYearlyOption(e.target.value)}
                                    className="recurrence-radio-input"
                                />
                                <span className="recurrence-radio-label">{yearlyOptions.weekdayOption}</span>
                            </label>
                        </div>
                    )}

                    
                    {/* Recurrence Description */}
                    <div className="recurrence-description">
                        <div className="recurrence-description-text" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                            <span>{getRecurrenceText()}</span>
                            {hasEndDate && (
                                <DatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    placeholder="Select end date"
                                />
                            )}
                        </div>

                        <div className="recurrence-end-date-controls">
                            {!hasEndDate && (
                                <button
                                    onClick={() => setHasEndDate(true)}
                                    className="recurrence-link-button"
                                    type="button"
                                >
                                    Choose an end date
                                </button>
                            )}
                            {hasEndDate && (
                                <button
                                    onClick={() => setHasEndDate(false)}
                                    className="recurrence-link-button"
                                    type="button"
                                >
                                    Remove end date
                                </button>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="recurrence-modal-footer">
                    <button
                        onClick={handleSave}
                        className="recurrence-button recurrence-button-primary"
                        type="button"
                    >
                        Save
                    </button>
                    <div className="recurrence-footer-buttons">
                        <button
                            onClick={onCancel}
                            className="recurrence-button recurrence-button-secondary"
                            type="button"
                        >
                            Discard
                        </button>
                        <button
                            onClick={() => console.log('Remove series')}
                            className="recurrence-button recurrence-button-danger"
                            type="button"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const RecurrencePickerComponent: React.FC<IRecurrencePickerProps> = ({
    isVisible,
    initialData,
    onSet,
    onCancel,
    onToggleVisibility
}) => {
    return (
        <div className="recurrence-picker-control">
            <button
                onClick={onToggleVisibility}
                className="open-picker-button"
            >
                Open Recurrence Picker
            </button>

            {initialData && (
                <div className="current-settings">
                    <h3 className="settings-title">Current Recurrence Settings:</h3>
                    <pre className="settings-data">
                        {JSON.stringify(initialData, null, 2)}
                    </pre>
                </div>
            )}

            {isVisible && (
                <RecurrencePicker
                    onSet={onSet}
                    onCancel={onCancel}
                    initialData={initialData || undefined}
                />
            )}
        </div>
    );
};