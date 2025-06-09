import * as React from 'react';
import { RRule, Frequency, Weekday, RRuleStrOptions } from 'rrule';

export interface IRecurrenceData {
    startDate: string;
    pattern: string;
    every: number;
    selectedDays: string[];
    monthlyOption: string;
    yearlyOption: string;
    endDate: string | null;
    hasEndDate: boolean;
    rrule?: string; // Add RRULE string
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

// RRULE Utility Functions
class RRuleConverter {
    private static dayKeyToWeekday: Record<string, typeof RRule.SU> = {
        'Su': RRule.SU,
        'M': RRule.MO,
        'T': RRule.TU,
        'W': RRule.WE,
        'Th': RRule.TH,
        'F': RRule.FR,
        'S': RRule.SA
    };

    private static weekdayToDayKey: Record<number, string> = {
        6: 'Su', // Sunday
        0: 'M',  // Monday
        1: 'T',  // Tuesday
        2: 'W',  // Wednesday
        3: 'Th', // Thursday
        4: 'F',  // Friday
        5: 'S'   // Saturday
    };

    // Convert UK date format (DD/MM/YYYY) to Date object
    private static parseUKDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        return new Date();
    }

    // Convert Date to UK format (DD/MM/YYYY)
    private static formatUKDate(date: Date): string {
        return date.toLocaleDateString('en-GB');
    }

    // Convert our data structure to RRULE
    static toRRule(data: IRecurrenceData): string {
        try {
            const startDate = this.parseUKDate(data.startDate);
            const endDate = data.hasEndDate && data.endDate ? this.parseUKDate(data.endDate) : null;

            let frequency: Frequency;
            const options: RRule.Options = {
                dtstart: startDate,
                interval: data.every || 1,
                freq: RRule.DAILY,
            };

            // Set end date if specified
            if (endDate) {
                options.until = endDate;
            }

            switch (data.pattern) {
                case 'day':
                    frequency = RRule.DAILY;
                    break;

                case 'week':
                    frequency = RRule.WEEKLY;
                    if (data.selectedDays.length > 0) {
                        options.byweekday = data.selectedDays.map(day => this.dayKeyToWeekday[day]).filter(Boolean);
                    }
                    break;

                case 'month':
                    frequency = RRule.MONTHLY;
                    if (data.monthlyOption === 'day') {
                        options.bymonthday = startDate.getDate();
                    } else {
                        // Calculate weekday and position
                        const weekday = this.dayKeyToWeekday[this.weekdayToDayKey[startDate.getDay()]];
                        const weekOfMonth = this.getWeekOfMonth(startDate);
                        const isLastWeek = this.isLastWeekOfMonth(startDate);
                        
                        if (isLastWeek) {
                            options.byweekday = weekday.nth(-1); // Last occurrence
                        } else {
                            options.byweekday = weekday.nth(weekOfMonth);
                        }
                    }
                    break;

                case 'year':
                    frequency = RRule.YEARLY;
                    if (data.yearlyOption === 'date') {
                        options.bymonth = startDate.getMonth() + 1;
                        options.bymonthday = startDate.getDate();
                    } else {
                        options.bymonth = startDate.getMonth() + 1;
                        const weekday = this.dayKeyToWeekday[this.weekdayToDayKey[startDate.getDay()]];
                        const weekOfMonth = this.getWeekOfMonth(startDate);
                        const isLastWeek = this.isLastWeekOfMonth(startDate);
                        
                        if (isLastWeek) {
                            options.byweekday = weekday.nth(-1);
                        } else {
                            options.byweekday = weekday.nth(weekOfMonth);
                        }
                    }
                    break;

                default:
                    frequency = RRule.DAILY;
            }

            options.freq = frequency;
            
            // Create RRule instance and return its string representation
            const rule = new RRule(options);
            return rule.toString();
        } catch (error) {
            console.error('Error creating RRULE:', error);
            throw error;
        }
    }

    // Convert RRULE to our data structure
    static fromRRule(rruleStr: string, startDateStr?: string): IRecurrenceData {
        try {
            // Remove RRULE: prefix if present
            const cleanRruleStr = rruleStr.replace(/^RRULE:/, '');
            const rule = RRule.fromString(cleanRruleStr);
            const options = rule.options;
            
            const startDate = startDateStr || this.formatUKDate(options.dtstart || new Date());
            const endDate = options.until ? this.formatUKDate(options.until) : null;
            
            let pattern: string;
            let selectedDays: string[] = [];
            let monthlyOption = 'day';
            let yearlyOption = 'date';

            switch (options.freq) {
                case RRule.DAILY:
                    pattern = 'day';
                    break;

                case RRule.WEEKLY:
                    pattern = 'week';
                    if (options.byweekday) {
                        selectedDays = (Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday])
                            .map(wd => {
                                const weekdayNum = typeof wd === 'number' ? wd : wd.getJsWeekday();
                                return this.weekdayToDayKey[weekdayNum] || 'M';
                            });
                    }
                    break;

                case RRule.MONTHLY:
                    pattern = 'month';
                    if (options.byweekday) {
                        monthlyOption = 'weekday';
                    }
                    break;

                case RRule.YEARLY:
                    pattern = 'year';
                    if (options.byweekday) {
                        yearlyOption = 'weekday';
                    }
                    break;

                default:
                    pattern = 'day';
            }

            return {
                startDate,
                pattern,
                every: options.interval || 1,
                selectedDays,
                monthlyOption,
                yearlyOption,
                endDate,
                hasEndDate: !!endDate,
                rrule: rruleStr
            };
        } catch (error) {
            console.error('Error parsing RRULE:', error, 'Input:', rruleStr);
            // Return default data structure
            return {
                startDate: startDateStr || this.formatUKDate(new Date()),
                pattern: 'day',
                every: 1,
                selectedDays: [],
                monthlyOption: 'day',
                yearlyOption: 'date',
                endDate: null,
                hasEndDate: false,
                rrule: rruleStr
            };
        }
    }

    // Generate human-readable description from RRULE
    static getDescription(rruleStr: string, locale = 'en'): string {
        try {
            if (!rruleStr) return 'No recurrence rule';
            
            // Remove RRULE: prefix if present
            const cleanRruleStr = rruleStr.replace(/^RRULE:/, '');
            const rule = RRule.fromString(cleanRruleStr);
            return rule.toText();
        } catch (error) {
            console.error('Error generating RRULE description:', error, 'Input:', rruleStr);
            return 'Invalid recurrence rule';
        }
    }

    // Get next N occurrences from RRULE
    static getOccurrences(rruleStr: string, count = 10): Date[] {
        try {
            if (!rruleStr) return [];
            
            // Remove RRULE: prefix if present
            const cleanRruleStr = rruleStr.replace(/^RRULE:/, '');
            const rule = RRule.fromString(cleanRruleStr);
            return rule.all((date, i) => typeof i === 'number' && i < count);
        } catch (error) {
            console.error('Error getting occurrences:', error, 'Input:', rruleStr);
            return [];
        }
    }

    // Helper methods
    private static getWeekOfMonth(date: Date): number {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
    }

    private static isLastWeekOfMonth(date: Date): boolean {
        const nextWeek = new Date(date);
        nextWeek.setDate(date.getDate() + 7);
        return nextWeek.getMonth() !== date.getMonth();
    }
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
            style={{ display: 'inline-block' }}
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
                    display: 'inline'
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
    const [rrulePreview, setRrulePreview] = React.useState<string>("");

    function getCurrentDate(): string {
        const today = new Date();
        return today.toLocaleDateString('en-GB');
    }

    function getDefaultEndDate(): string {
        const date = new Date();
        date.setMonth(date.getMonth() + 3); // 3 months from now
        return date.toLocaleDateString('en-GB');
    }

    // Update RRULE preview whenever settings change
    React.useEffect(() => {
        const currentData: IRecurrenceData = {
            startDate,
            pattern: recurrencePattern,
            every: everyValue,
            selectedDays,
            monthlyOption,
            yearlyOption,
            endDate: hasEndDate ? endDate : null,
            hasEndDate
        };

        try {
            const rrule = RRuleConverter.toRRule(currentData);
            setRrulePreview(rrule);
        } catch (error) {
            setRrulePreview("Error generating RRULE");
        }
    }, [startDate, recurrencePattern, everyValue, selectedDays, monthlyOption, yearlyOption, endDate, hasEndDate]);

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
        try {
            console.log("rrulePreview", rrulePreview);
            return RRuleConverter.getDescription(rrulePreview);
        } catch {
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
            hasEndDate,
            rrule: rrulePreview
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

                    {/* RRULE Preview */}
                    <div className="recurrence-rrule-preview" style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '4px',
                        border: '1px solid #e9ecef'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>RRULE:</div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {rrulePreview}
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
    const [nextOccurrences, setNextOccurrences] = React.useState<Date[]>([]);

    // Update occurrences preview when initialData changes
    React.useEffect(() => {
        if (initialData?.rrule) {
            try {
                const occurrences = RRuleConverter.getOccurrences(initialData.rrule, 5);
                setNextOccurrences(occurrences);
            } catch (error) {
                console.error('Error getting occurrences:', error);
                setNextOccurrences([]);
            }
        }
    }, [initialData]);

    const handleSet = (data: IRecurrenceData) => {
        // Generate RRULE if not already present
        if (!data.rrule) {
            try {
                data.rrule = RRuleConverter.toRRule(data);
            } catch (error) {
                console.error('Error generating RRULE:', error);
            }
        }
        onSet(data);
    };

    // Function to import RRULE string
    const importRRule = (rruleString: string) => {
        try {
            const data = RRuleConverter.fromRRule(rruleString);
            onSet(data);
        } catch (error) {
            console.error('Error importing RRULE:', error);
            alert('Invalid RRULE format');
        }
    };

    return (
        <div className="recurrence-picker-control">
            <button
                onClick={onToggleVisibility}
                className="open-picker-button"
                style={{
                    padding: '12px 24px',
                    backgroundColor: '#007acc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                }}
            >
                {initialData ? 'Edit Recurrence' : 'Set Recurrence'}
            </button>

            {initialData && (
                <div className="current-settings" style={{ 
                    marginTop: '16px', 
                    padding: '16px', 
                    border: '1px solid #ddd', 
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9'
                }}>
                    <h3 className="settings-title" style={{ 
                        margin: '0 0 12px 0', 
                        fontSize: '16px', 
                        fontWeight: '600' 
                    }}>
                        Current Recurrence Settings:
                    </h3>
                    
                    {/* Human-readable description */}
                    {initialData.rrule && (
                        <div style={{ marginBottom: '12px' }}>
                            <strong>Description:</strong> {RRuleConverter.getDescription(initialData.rrule)}
                        </div>
                    )}

                    {/* Next occurrences */}
                    {nextOccurrences.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <strong>Next occurrences:</strong>
                            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                {nextOccurrences.map((date, index) => (
                                    <li key={index} style={{ fontSize: '14px' }}>
                                        {date.toLocaleDateString('en-GB')} ({date.toLocaleDateString('en-US', { weekday: 'long' })})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* RRULE string */}
                    {initialData.rrule && (
                        <div style={{ marginBottom: '12px' }}>
                            <strong>RRULE:</strong>
                            <div style={{ 
                                fontSize: '12px', 
                                fontFamily: 'monospace', 
                                background: '#fff', 
                                padding: '8px', 
                                border: '1px solid #ccc', 
                                borderRadius: '4px',
                                wordBreak: 'break-all',
                                marginTop: '4px'
                            }}>
                                {initialData.rrule}
                            </div>
                            <button
                                onClick={() => navigator.clipboard.writeText(initialData.rrule || '')}
                                style={{
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    marginTop: '4px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                }}
                            >
                                Copy RRULE
                            </button>
                        </div>
                    )}

                    {/* Raw data (collapsible) */}
                    <details style={{ fontSize: '12px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Raw Settings Data</summary>
                        <pre style={{ 
                            fontSize: '11px', 
                            background: '#fff', 
                            padding: '8px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            marginTop: '8px',
                            overflow: 'auto'
                        }}>
                            {JSON.stringify(initialData, null, 2)}
                        </pre>
                    </details>
                </div>
            )}

            {/* RRULE Import Section */}
            <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Import RRULE:</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Paste RRULE string here..."
                        id="rrule-import-input"
                        style={{
                            flex: 1,
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                        }}
                    />
                    <button
                        onClick={() => {
                            const input = document.getElementById('rrule-import-input') as HTMLInputElement;
                            if (input.value.trim()) {
                                importRRule(input.value.trim());
                                input.value = '';
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Import
                    </button>
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    Example: FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=1
                </div>
            </div>

            {isVisible && (
                <RecurrencePicker
                    onSet={handleSet}
                    onCancel={onCancel}
                    initialData={initialData || undefined}
                />
            )}
        </div>
    );
};

// Utility functions for external use
export { RRuleConverter };

// Additional utility functions
export const RecurrenceUtils = {
    // Validate RRULE string
    isValidRRule: (rruleString: string): boolean => {
        try {
            RRule.fromString(rruleString);
            return true;
        } catch {
            return false;
        }
    },

    // Get human-readable description from RRULE
    getDescription: (rruleString: string): string => {
        return RRuleConverter.getDescription(rruleString);
    },

    // Get next N occurrences from RRULE
    getNextOccurrences: (rruleString: string, count = 10): Date[] => {
        return RRuleConverter.getOccurrences(rruleString, count);
    },

    // Get occurrences between two dates
    getOccurrencesBetween: (rruleString: string, startDate: Date, endDate: Date): Date[] => {
        try {
            const rule = RRule.fromString(rruleString);
            return rule.between(startDate, endDate);
        } catch (error) {
            console.error('Error getting occurrences between dates:', error);
            return [];
        }
    },

    // Check if a specific date matches the recurrence pattern
    occursOn: (rruleString: string, date: Date): boolean => {
        try {
            const rule = RRule.fromString(rruleString);
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            
            const occurrences = rule.between(dayStart, dayEnd);
            return occurrences.length > 0;
        } catch (error) {
            console.error('Error checking if date occurs:', error);
            return false;
        }
    },

    // Convert RRULE to different formats
    toICalendar: (rruleString: string, summary = 'Recurring Event'): string => {
        try {
            const rule = RRule.fromString(rruleString);
            const dtstart = rule.options.dtstart || new Date();
            
            const formatDate = (date: Date): string => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            return [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Your App//Recurrence Picker//EN',
                'BEGIN:VEVENT',
                `DTSTART:${formatDate(dtstart)}`,
                `RRULE:${rruleString.replace('RRULE:', '')}`,
                `SUMMARY:${summary}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');
        } catch (error) {
            console.error('Error converting to iCalendar:', error);
            return '';
        }
    }
};