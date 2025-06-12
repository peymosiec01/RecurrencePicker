
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
        if (!dateStr) return new Date();
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        return new Date();
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
        const date = this.parseDate(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
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
