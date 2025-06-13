let DateUtils: ReturnType<typeof createDateUtils>;

export const setDateUtils = (utils: ReturnType<typeof createDateUtils>) => {
    DateUtils = utils;
};

export const getDateUtils = () => {
    if (!DateUtils) {
        throw new Error("DateUtils not initialized. Call setDateUtils first.");
    }
    return DateUtils;
};

// Factory function to create date utility functions
export const createDateUtils = (locale: string) => {
    const parseDate = (dateStr: string): Date => DateTimeFormatter.parseDate(dateStr, locale);

    return {
        getToday(): string {
            return DateTimeFormatter.formatDateTime(new Date(), locale, 'date');
        },

        getTodayDateTime(includeTime = true): string {
            return DateTimeFormatter.formatDateTime(new Date(), locale, includeTime ? 'datetime' : 'date');
        },

        getOneYearFromToday(): string {
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            return DateTimeFormatter.formatDateTime(oneYearFromNow, locale, 'date');
        },

        parseDate,

        formatDate(date: Date): string {
            return DateTimeFormatter.formatDateTime(date, locale, 'date');
        },

        isValidDate(dateStr: string): boolean {
            try {
                return !isNaN(parseDate(dateStr).getTime());
            } catch {
                return false;
            }
        },

        isBefore(date1Str: string, date2Str: string): boolean {
            return parseDate(date1Str) < parseDate(date2Str);
        },

        isTodayOrFuture(dateStr: string): boolean {
            const date = parseDate(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            date.setHours(23, 0, 0, 0);
            return date >= today;
        },

        getTodayDate(): Date {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        },

        formatDateTime(date: Date): string {
            return DateTimeFormatter.formatDateTime(date, locale, 'datetime');
        },

        getOneYearFromDate(dateStr: string): string {
            const baseDate = parseDate(dateStr);
            const oneYearLater = new Date(baseDate);
            oneYearLater.setFullYear(baseDate.getFullYear() + 1);
            return DateTimeFormatter.formatDateTime(oneYearLater, locale, 'date');
        },

        parseDateTime(dateTimeStr: string): Date {
            return DateTimeFormatter.parseDate(dateTimeStr, locale);
        },

        toHtmlDateTime(dateTimeStr: string): string {
            return DateTimeFormatter.formatDateTime(dateTimeStr, locale, 'datetime');
        }
    };
};

// Modern DateTime Formatter with automatic format detection
export class DateTimeFormatter {
    private static readonly DATE_PATTERNS = [
        // ISO formats (most reliable)
        { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?/, format: 'ISO' },

        // Slash formats with time (allow comma or space)
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})$/, format: 'SLASH' },

        // Dot formats with time (allow comma or space)
        { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})[,\s]+(\d{1,2}):(\d{2})$/, format: 'DOT' },

        // Dash formats with time (allow comma or space)
        { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})[,\s]+(\d{1,2}):(\d{2})$/, format: 'DASH' },

        // --- date-only patterns ---
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: 'SLASH_DATE' },
        { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, format: 'DOT_DATE' },
        { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, format: 'DASH_DATE' },
    ] as const;

    private static readonly LOCALE_PREFERENCES = {
        'en-US': { dayFirst: false, separator: '/' },
        'en-GB': { dayFirst: true, separator: '/' },
        'en-AU': { dayFirst: true, separator: '/' },
        'de-DE': { dayFirst: true, separator: '.' },
        'fr-FR': { dayFirst: true, separator: '/' },
        'it-IT': { dayFirst: true, separator: '/' },
        'es-ES': { dayFirst: true, separator: '/' },
        'pt-BR': { dayFirst: true, separator: '/' },
        'ja-JP': { dayFirst: false, separator: '/' },
        'ko-KR': { dayFirst: false, separator: '.' },
    } as const;

    /**
     * Intelligently parse a date string or pass through a Date object
     */
    static parseDate(input: Date | string, locale: string): Date {
        if (input instanceof Date) {
            if (isNaN(input.getTime())) {
                throw new Error('Invalid Date object provided');
            }
            return input;
        }

        // Try native parsing first (handles ISO and some other formats)
        const nativeDate = new Date(input);
        if (!isNaN(nativeDate.getTime())) {
            return nativeDate;
        }
        console.warn(`Native Date parsing failed for input: "${input}". Falling back to smart parsing.`);
        // Smart parsing with pattern matching
        return this.smartParse(input, locale);
    }

    /**
     * Smart parsing with automatic format detection
     */
    private static smartParse(dateString: string, locale: string): Date {
        for (const pattern of this.DATE_PATTERNS) {
            const match = dateString.match(pattern.regex);
            if (!match) continue;

            try {
                const date = this.parseWithPattern(match, pattern.format, locale);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            } catch {
                continue;
            }
        }

        throw new Error(`Unable to parse date string: "${dateString}"`);
    }

    /**
     * Parse matched groups based on detected pattern
     */
    private static parseWithPattern(
        match: RegExpMatchArray,
        format: string,
        locale: string
    ): Date {
        // For date-only patterns, set hour/minute/second to 0
        if (format.endsWith('_DATE')) {
            const [, p1, p2, p3] = match;
            const { dayFirst } = this.getLocalePreference(locale);
            const parts = [+p1, +p2, +p3];
            const { day, month, year } = this.detectDateParts(parts, dayFirst);
            return new Date(year, month - 1, day, 0, 0, 0);
        }

        const [, p1, p2, p3, hour, minute, second = '0'] = match;

        if (format === 'ISO') {
            // ISO format: YYYY-MM-DD
            return new Date(+p1, +p2 - 1, +p3, +hour, +minute, +second);
        }

        // For ambiguous formats, use smart detection
        const { dayFirst } = this.getLocalePreference(locale);
        const parts = [+p1, +p2, +p3];

        // Auto-detect based on values
        const { day, month, year } = this.detectDateParts(parts, dayFirst);

        return new Date(year, month - 1, day, +hour, +minute, +second);
    }

    /**
     * Intelligently detect day/month/year from numeric parts
     */
    private static detectDateParts(
        parts: number[],
        preferDayFirst: boolean
    ): { day: number; month: number; year: number } {
        const [p1, p2, p3] = parts;

        // Year is always the 4-digit number
        const yearIndex = parts.findIndex(p => p > 31);
        if (yearIndex === -1) {
            throw new Error('Unable to identify year in date');
        }

        const year = parts[yearIndex];
        const remaining = parts.filter((_, i) => i !== yearIndex);
        const [first, second] = remaining;

        // If one number is > 12, it must be the day
        if (first > 12) {
            return { day: first, month: second, year };
        }
        if (second > 12) {
            return { day: second, month: first, year };
        }

        // Both numbers are ≤ 12, use locale preference
        if (preferDayFirst) {
            return { day: first, month: second, year };
        } else {
            return { day: second, month: first, year };
        }
    }

    /**
     * Get locale-specific formatting preferences
     */
    private static getLocalePreference(locale: string) {
        return this.LOCALE_PREFERENCES[locale as keyof typeof this.LOCALE_PREFERENCES]
            ?? this.LOCALE_PREFERENCES['en-US'];
    }

    /**
     * Main formatting function - handles both Date objects and strings
     */
    static formatDateTime(
        date: Date | string,
        locale: string,
        mode: 'datetime' | 'date' = 'datetime',
        options: {
            dateStyle?: 'full' | 'long' | 'medium' | 'short';
            timeStyle?: 'full' | 'long' | 'medium' | 'short';
            hour12?: boolean;
        } = {}
    ): string {
        const {
            dateStyle = 'short',
            timeStyle = 'short',
            hour12 = false
        } = options;

        try {
            const dateObj = this.parseDate(date, locale);

            // Always use 4-digit year for date part
            const dateOptions: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                ...(mode === 'datetime' ? {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12
                } : {})
            };

            const formatter = new Intl.DateTimeFormat(locale, dateOptions);
            return formatter.format(dateObj);
        } catch (error) {
            console.error('DateTime formatting error:', error);
            throw new Error(`Failed to format date: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Alternative method with granular control
     */
    static formatDateTimeCustom(
        date: Date | string,
        locale: string,
        showTime = true
    ): string {
        const dateObj = this.parseDate(date, locale);

        const dateStr = dateObj.toLocaleDateString(locale, { year: 'numeric', month: 'numeric', day: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        return showTime ? `${dateStr} ${timeStr}` : dateStr;
    }
}

// Usage examples:
/*
// Works with various formats automatically
console.log(DateTimeFormatter.formatDateTime("23/06/2025 15:58", "en-GB"));
console.log(DateTimeFormatter.formatDateTime("06/23/2025 15:58", "en-US"));
console.log(DateTimeFormatter.formatDateTime("23.06.2025 15:58", "de-DE"));
console.log(DateTimeFormatter.formatDateTime("2025-06-23T15:58", "en-US"));
console.log(DateTimeFormatter.formatDateTime(new Date(), "en-US"));

// With custom styling
console.log(DateTimeFormatter.formatDateTime("23/06/2025 15:58", "en-GB", {
  dateStyle: 'full',
  timeStyle: 'short'
}));
*/
