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
export const createDateUtils = (locale: string) => ({
    getToday(): string {
        console.log("Getting today's date in locale:", locale);
        return new Date().toLocaleDateString(locale);
    },

    getTodayDateTime(includeTime = true): string {
        const today = new Date();
        return includeTime ? this.formatDateTime(today) : today.toLocaleDateString(locale);
    },

    getOneYearFromToday(): string {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        return oneYearFromNow.toLocaleDateString(locale);
    },

    parseDate(dateStr: string): Date {
        // if (!dateStr) return new Date();
        // const parts = dateStr.split('/');
        // if (parts.length === 3) {
        //     const [day, month, year] = parts;
        //     return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        // }
        return DateTimeFormatter.parseDate(dateStr, locale);
    },

    // getOneYearFromDate(dateStr: string): string {
    //     console.log("Calculating one year from date:", dateStr, "Locale:", locale);
    //     const baseDate = this.parseDate(dateStr);
    //     const oneYearLater = new Date(baseDate);
    //     oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    //     console.log("One year from date:", dateStr, "->", oneYearLater.toLocaleDateString(locale));
    //     return oneYearLater.toLocaleDateString(locale);
    // },

    formatDate(date: Date): string {
        console.log("Formatting date:", date, "Locale:", locale);
        return date.toLocaleDateString(locale);
    },

    isValidDate(dateStr: string): boolean {
        if (!dateStr) return false;
        const date = this.parseDate(dateStr);
        return !isNaN(date.getTime());
    },

    isBefore(date1Str: string, date2Str: string): boolean {
        const date1 = this.parseDate(date1Str);
        const date2 = this.parseDate(date2Str);
        return date1 < date2;
    },

    isTodayOrFuture(dateStr: string): boolean {
        const date = DateTimeFormatter['parseDate'](dateStr, locale); // Use bracket notation to bypass TypeScript's private restriction (not recommended for production)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(23, 0, 0, 0);
        console.log("Checking if date is today or future:", date, "Today:", today, "Locale:", locale);
        return date >= today;
    },

    getTodayDate(): Date {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    },

    formatDateTime(date: Date): string {
        console.log("Formatting date time:", date, "Locale:", locale);
        const dateStr = date.toLocaleDateString(locale);
        const timeStr = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        return `${dateStr} ${timeStr}`;
    },

    // parseDateTime(dateTimeStr: string): Date {
    //     if (!dateTimeStr) return new Date();

    //     const parts = dateTimeStr.trim().split(' ');
    //     const dateStr = parts[0];
    //     const timeStr = parts[1] || '00:00';

    //     let date: Date;

    //     if (locale === 'en-US') {
    //         const [month, day, year] = dateStr.split('/');
    //         date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    //     } else {
    //         const [day, month, year] = dateStr.split('/');
    //         date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    //     }

    //     const [hours, minutes] = timeStr.split(':').map(v => parseInt(v));
    //     date.setHours(hours || 0, minutes || 0, 0, 0);
    //     return date;
    // },

    // Primary implementation using Intl.DateTimeFormat for robust locale handling
    getOneYearFromDate(dateStr: string): string {
        console.log("Calculating one year from date:", dateStr, "Locale:", locale);
        
        const baseDate = this.parseDateTime(dateStr);
        
        // Add one year
        const oneYearLater = new Date(baseDate);
        oneYearLater.setFullYear(baseDate.getFullYear() + 1);
        
        // Handle leap year edge case
        if (baseDate.getMonth() === 1 && baseDate.getDate() === 29) {
            if (oneYearLater.getMonth() !== 1) {
                oneYearLater.setDate(0); // Last day of February
            }
        }
        
        const result = oneYearLater.toLocaleDateString(locale);
        console.log("One year from date:", dateStr, "->", result);
        return result;
    },

    // Your existing parseDateTime method (enhanced for better international support)
    parseDateTime(dateTimeStr: string): Date {
        if (!dateTimeStr) return new Date();

        const parts = dateTimeStr.trim().split(' ');
        const dateStr = parts[0];
        const timeStr = parts[1] || '00:00';

        let date: Date;

        // Enhanced parsing logic for better international support
        const dateParts = dateStr.split(/[/.-]/);
        
        
        if (dateParts.length >= 3) {
            // let day: number, month: number, year: number;
            
            // Use Intl.DateTimeFormat to determine locale's date format
            const formatter = new Intl.DateTimeFormat(locale);
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
            
            // Handle 2-digit years
            if (year < 100) {
                year += (year < 50) ? 2000 : 1900;
            }
            
            date = new Date(year, month - 1, day);
        } else {
            // Fallback to your original logic
            if (locale === 'en-US') {
                const [month, day, year] = dateStr.split('/');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                const [day, month, year] = dateStr.split('/');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
        }

        // Handle time parsing
        const timeParts = timeStr.split(':');
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const seconds = parseInt(timeParts[2]) || 0;
        
        date.setHours(hours, minutes, seconds, 0);
        return date;
    },

    toHtmlDateTime(dateTimeStr: string): string {
        const date = this.parseDateTime(dateTimeStr);
        console.log("Converting to HTML date time:", dateTimeStr, "->", date.toLocaleString(locale), "Locale:", locale);
        return date.toLocaleString(locale);
    }
});

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

        // If mode is 'date', omit timeStyle
        const formatter = new Intl.DateTimeFormat(locale, {
        dateStyle,
        ...(mode === 'datetime' ? { timeStyle } : {}),
        hour12
        });

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
    showTime: boolean = true
  ): string {
    const dateObj = this.parseDate(date, locale);
    
    const dateStr = dateObj.toLocaleDateString(locale);
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
