import * as React from 'react';
import { RRule, Frequency, Weekday, RRuleStrOptions } from 'rrule';
import { getDateUtils, DateTimeFormatter } from './DateUtils';

export interface IRecurrenceData {
    startDate: string;
    pattern: string;
    every: number;
    selectedDays: string[];
    monthlyOption: string;
    yearlyOption: string;
    endDate: string | null;
    hasEndDate: boolean;
    rrule?: string; 
    description?: string; 
    locale?: string;
}

interface IRecurrencePickerProps {
    isVisible: boolean;
    dateLocale: string;
    initialData: IRecurrenceData | null;
    onSet: (data: IRecurrenceData) => void;
    onCancel: () => void;
    onToggleVisibility: () => void;
}

interface IDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minDate?: string;
    maxDate?: string;
    showTime?: boolean;
    locale?: string;
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
        0: 'Su', // Sunday
        1: 'M',  // Monday
        2: 'T',  // Tuesday
        3: 'W',  // Wednesday
        4: 'Th', // Thursday
        5: 'F',  // Friday
        6: 'S'   // Saturday
    };

    // Convert our data structure to RRULE
    static toRRule(data: IRecurrenceData): string {
        try {
            const startDate = getDateUtils().parseDate(data.startDate);
            const endDate = data.hasEndDate && data.endDate ? getDateUtils().parseDate(data.endDate) : null;

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
            
            const startDate = startDateStr || getDateUtils().formatDate(options.dtstart || new Date());
            const endDate = options.until ? getDateUtils().formatDate(options.until) : null;
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
                startDate: startDateStr || getDateUtils().getToday(),
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
        const year = date.getFullYear();
        const month = date.getMonth();
        const dayOfWeek = date.getDay();
        const dateOfMonth = date.getDate();
        
        // Count how many times this weekday has occurred up to and including this date
        let count = 0;
        for (let day = 1; day <= dateOfMonth; day++) {
            const testDate = new Date(year, month, day);
            if (testDate.getDay() === dayOfWeek) {
                count++;
            }
        }
        
        return count;
    }

    private static isLastWeekOfMonth(date: Date): boolean {
        const nextWeek = new Date(date);
        nextWeek.setDate(date.getDate() + 7);
        return nextWeek.getMonth() !== date.getMonth();
    }
}

const DatePicker: React.FC<IDatePickerProps> = ({ 
    value, 
    onChange, 
    placeholder = "Select date",
    minDate,
    maxDate,
    locale,
    showTime = false
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState(value || "");
    const [error, setError] = React.useState<string>("");
    const pickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setDisplayValue(value || "");
        setError("");
    }, [value]);

    React.useEffect(() => {
    }, [displayValue]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                const target = event.target as Element;
                if (!target.closest('.recurrence-date-native')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateString: string): string => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(locale);
        } catch {
            return dateString;
        }
    };

    const validateDate = (dateStr: string): string => {
        if (!dateStr) return "";

        if (!getDateUtils().isValidDate(dateStr)) {
            return "Invalid date format";
        }

        if (minDate && !getDateUtils().isBefore(minDate, dateStr) && dateStr !== minDate) {
            return `Date must be after ${minDate}`;
        }

        if (maxDate && !getDateUtils().isBefore(dateStr, maxDate) && dateStr !== maxDate) {
            return `Date must be before ${maxDate}`;
        }

        return "";
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = e.target.value;
        const formattedDate = showTime? getDateUtils().formatDateTime(new Date(selectedDate)) : formatDate(selectedDate);
        const validationError = validateDate(formattedDate);
        
        setDisplayValue(formattedDate);
        setError(validationError);
        
        if (!validationError) {
            onChange(formattedDate);
        }
    };

    // Add method to close picker manually
    const closePicker = () => {
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
        setError("");
    };

    return (
        <div 
            className="recurrence-date-picker" 
            ref={pickerRef}
            style={{ display: 'inline-block', marginRight: 'auto' }}
        >
            <input
                type="text"
                value={displayValue}
                onChange={handleTextChange}
                onClick={handleTextClick}
                placeholder={placeholder}
                className="recurrence-date-input recurrence-date-text-like"
                style={{
                    cursor: 'pointer',
                    background: 'transparent',
                    border: error ? '1px solid #dc3545' : 'none',
                    outline: 'none',
                    padding: '8px 0',
                    fontSize: '14px',
                    color: error ? '#dc3545' : '#374151',
                    textDecoration: 'underline',
                    textDecorationColor: error ? '#dc3545' : 'transparent',
                    transition: 'text-decoration-color 0.2s',
                    display: 'inline',
                    width: showTime ? '150px' : '110px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.textDecorationColor = error ? '#dc3545' : '#3b82f6';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.textDecorationColor = error ? '#dc3545' : 'transparent';
                }}
                onFocus={(e) => {
                    e.currentTarget.style.textDecorationColor = error ? '#dc3545' : '#3b82f6';
                }}
            />

            {error && (
                <div style={{
                    position: 'absolute',
                    fontSize: '12px',
                    color: '#dc3545',
                    marginTop: '2px',
                    zIndex: 1000
                }}>
                    {error}
                </div>
            )}

            {/* {isOpen && (
                <div className="recurrence-date-dropdown">
                    <input
                        type="date"
                        value={convertToInputFormat(displayValue)}
                        onChange={handleDateChange}
                        className="recurrence-date-native"
                        autoFocus
                        min={minDate ? convertToInputFormat(minDate) : undefined}
                        max={maxDate ? convertToInputFormat(maxDate) : undefined}
                    />
                </div>
            )} */}
            {isOpen && (
                <div className="recurrence-date-dropdown">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px' }}>
                        <input
                            type={showTime ? "datetime-local" : "date"}
                            value={convertToInputFormat(displayValue)}
                            onChange={handleDateChange}
                            className="recurrence-date-native"
                            autoFocus
                            style={{ border: 'none', outline: 'none', background: 'transparent' }}
                            min={minDate ? convertToInputFormat(minDate) : undefined}
                            max={maxDate ? convertToInputFormat(maxDate) : undefined}
                        />
                        <button
                            onClick={closePicker}
                            style={{
                                background: '#007acc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            ✓
                        </button>
                    </div>
                </div>
            )}
            
        </div>
    );
};

const RecurrencePicker: React.FC<{
    onSet: (data: IRecurrenceData) => void;
    onCancel: () => void;
    dateLocale: string;
    initialData?: IRecurrenceData;
}> = ({ onSet, onCancel, dateLocale, initialData = {} as IRecurrenceData }) => {
    // Use system defaults for dates
    const getDefaultStartDate = () => initialData?.startDate ? DateTimeFormatter.formatDateTime(initialData?.startDate, dateLocale) : getDateUtils().getToday();
    const getDefaultEndDate = () => initialData?.endDate ? DateTimeFormatter.formatDateTime(initialData?.endDate, dateLocale, 'date') : getDateUtils().getOneYearFromToday();

    const [startDate, setStartDate] = React.useState(getDefaultStartDate());
    const [recurrencePattern, setRecurrencePattern] = React.useState(initialData?.pattern || "day");
    const [everyValue, setEveryValue] = React.useState(initialData?.every || 1);
    const [selectedDays, setSelectedDays] = React.useState<string[]>(initialData?.selectedDays || []);
    const [monthlyOption, setMonthlyOption] = React.useState(initialData?.monthlyOption || "day");
    const [yearlyOption, setYearlyOption] = React.useState(initialData?.yearlyOption || "date");
    const [endDate, setEndDate] = React.useState(getDefaultEndDate());
    const [hasEndDate, setHasEndDate] = React.useState(initialData?.hasEndDate !== false);
    const [rrulePreview, setRrulePreview] = React.useState<string>("");
    const [dateErrors, setDateErrors] = React.useState<{start?: string, end?: string}>({});

    // Store initial values for reset functionality
    const initialValues = React.useRef({
        startDate: getDefaultStartDate(),
        pattern: initialData?.pattern || "day",
        every: initialData?.every || 1,
        selectedDays: initialData?.selectedDays || [],
        monthlyOption: initialData?.monthlyOption || "day",
        yearlyOption: initialData?.yearlyOption || "date",
        endDate: getDefaultEndDate(),
        hasEndDate: initialData?.hasEndDate !== false
    });

    // Validation function
    const validateDates = React.useCallback(() => {
        const errors: {start?: string, end?: string} = {};

        // Validate start date
        if (!getDateUtils().isTodayOrFuture(startDate)) {
            errors.start = "Start date cannot be in the past";
        }

        // Validate end date if enabled
        if (hasEndDate && endDate) {
            if (!getDateUtils().isValidDate(endDate)) {
                errors.end = "Invalid end date";
            } else if (!getDateUtils().isBefore(startDate, endDate)) {
                errors.end = "End date must be after start date";
            }
        }

        setDateErrors(errors);
        return Object.keys(errors).length === 0;
    }, [startDate, endDate, hasEndDate]);

    // Validate dates whenever they change
    React.useEffect(() => {
        validateDates();
    }, [validateDates]);


    // Handle start date change with validation
    const handleStartDateChange = (newStartDate: string) => {
        setStartDate(newStartDate);
        
        // Always update end date to be one year from new start date
        if (getDateUtils().isValidDate(newStartDate)) {
            const newEndDate = getDateUtils().getOneYearFromDate(newStartDate);
            setEndDate(newEndDate);
        }
    };

    // Handle end date change with validation
    const handleEndDateChange = (newEndDate: string) => {
        setEndDate(newEndDate);
    };

    // Handle enabling end date
    const handleEnableEndDate = () => {
        setHasEndDate(true);
        if (!endDate || !getDateUtils().isBefore(startDate, endDate)) {
            // Set default end date to one year from start date
            const oneYearFromStart = new Date(getDateUtils().parseDate(startDate));
            oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
            setEndDate(getDateUtils().formatDate(oneYearFromStart));
        }
    };

    // Update RRULE preview whenever settings change
    React.useEffect(() => {
        if (!validateDates()) return;

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
    }, [startDate, recurrencePattern, everyValue, selectedDays, monthlyOption, yearlyOption, endDate, hasEndDate, validateDates]);


    // Helper function to parse date string and get date components
    const getDateComponents = (dateStr: string) => {
        try {
            // Enhanced parsing logic for better international support
            const dateParts = dateStr.split(/[/.-]/);
            
            
            if (dateParts.length >= 3) {
                // let day: number, month: number, year: number;
                
                // Use Intl.DateTimeFormat to determine locale's date format
                const formatter = new Intl.DateTimeFormat(dateLocale);
                const formatParts = formatter.formatToParts(new Date(2023, 0, 15)); // Jan 15, 2023
                const order = formatParts
                    .filter(part => ['day', 'month', 'year'].includes(part.type))
                    .map(part => part.type);
                
                // Parse according to locale format
                const values: Record<string, number> = {};
                order.forEach((type, index) => {
                    if (index < dateParts.length) {
                        values[type] = parseInt(dateParts[index]);
                    }
                });
                
                const day = values.day;
                const month = values.month;
                let year = values.year;
                const date = new Date(year, month - 1, day);
                return {
                    date,
                    dayOfMonth: day,
                    monthName: date.toLocaleDateString(dateLocale, { month: 'long' }),
                    dayName: date.toLocaleDateString(dateLocale, { weekday: 'long' }),
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
        const year = date.getFullYear();
        const month = date.getMonth();
        const dayOfWeek = date.getDay();
        const dateOfMonth = date.getDate();
        
        // Count how many times this weekday has occurred up to and including this date
        let count = 0;
        for (let day = 1; day <= dateOfMonth; day++) {
            const testDate = new Date(year, month, day);
            if (testDate.getDay() === dayOfWeek) {
                count++;
            }
        }
        
        const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
        return ordinals[count - 1] || '5th';
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

   // Update handleSave to include validation and description
    const handleSave = () => {
        if (!validateDates()) {
            return; // Don't save if validation fails
        }

        const recurrenceData: IRecurrenceData & { nextOccurrences?: string[] } = {
            startDate,
            pattern: recurrencePattern,
            every: everyValue,
            selectedDays,
            monthlyOption,
            yearlyOption,
            endDate: hasEndDate ? endDate : null,
            hasEndDate,
            rrule: "", // will be set below
            description: "", // will be set below
            // Add nextOccurrences as formatted strings (date and time)
            nextOccurrences: RRuleConverter.getOccurrences(rrulePreview, 10).map(date =>
                date.toLocaleString(dateLocale)
            )
        };

        try {
            // Generate fresh RRULE and description
            const rrule = RRuleConverter.toRRule(recurrenceData);
            recurrenceData.rrule = rrule;
            recurrenceData.description = RRuleConverter.getDescription(rrule);
            // Optionally, update nextOccurrences if you want more/fewer
            recurrenceData.nextOccurrences = RRuleConverter.getOccurrences(rrule, 10).map(date =>
                date.toLocaleString(dateLocale)
            );
        } catch (error) {
            console.error('Error generating RRULE:', error);
            recurrenceData.rrule = rrulePreview;
            recurrenceData.description = RRuleConverter.getDescription(rrulePreview);
        }

        onSet(recurrenceData);
    };

    const handleDiscard = () => {
        setStartDate(initialValues.current.startDate);
        setRecurrencePattern(initialValues.current.pattern);
        setEveryValue(initialValues.current.every);
        setSelectedDays(initialValues.current.selectedDays);
        setMonthlyOption(initialValues.current.monthlyOption);
        setYearlyOption(initialValues.current.yearlyOption);
        setEndDate(initialValues.current.endDate);
        setHasEndDate(initialValues.current.hasEndDate);
        onCancel();
    };

    
    // Add Remove handler to clear everything
    const handleRemove = () => {
        const emptyData: IRecurrenceData = {
            startDate: getDateUtils().getToday(),
            pattern: "day",
            every: 1,
            selectedDays: [],
            monthlyOption: "day",
            yearlyOption: "date",
            endDate: null,
            hasEndDate: false,
            rrule: "",
            description: ""
        };
        onSet(emptyData);
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
                        <div style={{
                            alignItems: 'flex-start',
                            display: 'inline-flex'
                        }}>
                            <DatePicker
                                locale={dateLocale}
                                showTime={true}
                                value={getDateUtils().toHtmlDateTime(startDate)}
                                onChange={handleStartDateChange} 
                                placeholder="DD/MM/YYYY HH:MM"
                            />
                            {dateErrors.start && (
                                <div style={{
                                    fontSize: '12px',
                                    color: '#dc3545',
                                    marginTop: '4px'
                                }}>
                                    {dateErrors.start}
                                </div>
                            )}
                        </div>
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
                        </div>

                        <div className="recurrence-end-date-controls" style={{marginLeft: 'auto'}}>
                            {hasEndDate && (
                                <div className="">
                                    <DatePicker
                                        showTime={false}
                                        value={endDate}
                                        onChange={handleEndDateChange}
                                        placeholder="Select end date"
                                    />
                                    <button
                                        onClick={() => setHasEndDate(false)}
                                        className="recurrence-link-button"
                                        style={{
                                            background: '#007acc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        x
                                    </button>
                                </div>
                            )}
                            {!hasEndDate && (
                                <button
                                    onClick={handleEnableEndDate}
                                    className="recurrence-link-button"
                                    type="button"
                                >
                                    Choose an end date
                                </button>
                            )}
                        </div>
                        {dateErrors.end && (
                            <div style={{
                                fontSize: '12px',
                                color: '#dc3545',
                                marginTop: '4px',
                                marginLeft: 'auto'
                            }}>
                                {dateErrors.end}
                            </div>
                        )}
                    </div>

                    {/* RRULE Preview */}
                    <div className="recurrence-rrule-preview" style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '4px',
                        border: '1px solid #e9ecef',
                        display: 'none'
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
                        disabled={Object.keys(dateErrors).length > 0}
                        style={{
                            opacity: Object.keys(dateErrors).length > 0 ? 0.6 : 1,
                            cursor: Object.keys(dateErrors).length > 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Save
                    </button>
                    <div className="recurrence-footer-buttons">
                        <button
                            onClick={handleDiscard} // Changed from onCancel to handleDiscard
                            className="recurrence-button recurrence-button-secondary"
                            type="button"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleRemove} // Changed to handleRemove
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
    dateLocale,
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
                    backgroundColor: '#f9f9f9',
                    display: "none"
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
                                        {date.toLocaleDateString(dateLocale)} ({date.toLocaleDateString(dateLocale, { weekday: 'long' })})
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
                            overflow: 'auto',
                            display: 'none'
                        }}>
                            {JSON.stringify(initialData, null, 2)}
                        </pre>
                    </details>
                </div>
            )}

            {/* RRULE Import Section */}
            <div style={{ marginTop: '16px', display: 'none' }}>
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
                    dateLocale={dateLocale}
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