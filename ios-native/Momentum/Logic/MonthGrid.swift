// MonthGrid.swift
// Works out the cells of a month calendar: blank cells before the 1st (so the 1st lands
// under the right weekday), one cell per day, then blanks to finish the last row.

import Foundation

struct MonthGrid {
    /// Midnight on the 1st of the month.
    let monthStart: Date
    /// Rows of 7. `nil` = blank cell, otherwise midnight of that day.
    let cells: [Date?]

    init(containing date: Date, calendar: Calendar = .current) {
        let start = calendar.dateInterval(of: .month, for: date)?.start ?? calendar.startOfDay(for: date)
        let dayCount = calendar.range(of: .day, in: .month, for: start)?.count ?? 30

        // weekday: 1 = Sunday … 7 = Saturday. firstWeekday is 1 (Sunday) or 2 (Monday) etc.
        let weekdayOfFirst = calendar.component(.weekday, from: start)
        let leadingBlanks = (weekdayOfFirst - calendar.firstWeekday + 7) % 7

        var cells: [Date?] = Array(repeating: nil, count: leadingBlanks)
        for offset in 0..<dayCount {
            cells.append(calendar.date(byAdding: .day, value: offset, to: start))
        }
        while cells.count % 7 != 0 {
            cells.append(nil)
        }

        self.monthStart = start
        self.cells = cells
    }

    var leadingBlankCount: Int {
        cells.prefix(while: { $0 == nil }).count
    }

    /// Single-letter weekday headers, starting on the calendar's first weekday ("S M T W T F S").
    static func weekdaySymbols(calendar: Calendar = .current) -> [String] {
        let symbols = calendar.veryShortStandaloneWeekdaySymbols   // always Sunday-first
        let shift = calendar.firstWeekday - 1
        return Array(symbols[shift...] + symbols[..<shift])
    }
}
