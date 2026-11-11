// MonthGridTests.swift
// Checks that each month's days land under the correct weekday in the calendar grid.

import Foundation
import Testing
@testable import Momentum

@MainActor
struct MonthGridTests {

    @Test func november2026StartsOnSunday() {
        // Nov 1, 2026 is a Sunday → no blank cells when weeks start on Sunday.
        let calendar = testCalendar(firstWeekday: 1)
        let grid = MonthGrid(containing: makeDate(2026, 11, 20, calendar: calendar), calendar: calendar)
        #expect(grid.leadingBlankCount == 0)
        #expect(grid.cells.compactMap { $0 }.count == 30)
        #expect(grid.cells.count == 35)   // 5 full rows
        #expect(grid.monthStart == makeDate(2026, 11, 1, hour: 0, calendar: calendar))
    }

    @Test func mondayFirstWeekShiftsTheGrid() {
        // Same month, weeks starting Monday → Sunday the 1st is the 7th column.
        let calendar = testCalendar(firstWeekday: 2)
        let grid = MonthGrid(containing: makeDate(2026, 11, 20, calendar: calendar), calendar: calendar)
        #expect(grid.leadingBlankCount == 6)
        #expect(grid.cells.count == 42)   // 6 rows
    }

    @Test func february2026FitsInExactlyFourRows() {
        // Feb 1, 2026 is a Sunday and February has 28 days.
        let calendar = testCalendar(firstWeekday: 1)
        let grid = MonthGrid(containing: makeDate(2026, 2, 10, calendar: calendar), calendar: calendar)
        #expect(grid.leadingBlankCount == 0)
        #expect(grid.cells.count == 28)
        #expect(!grid.cells.contains { $0 == nil })
    }

    @Test func leapYearFebruaryHas29Days() {
        // Feb 1, 2028 is a Tuesday.
        let calendar = testCalendar(firstWeekday: 1)
        let grid = MonthGrid(containing: makeDate(2028, 2, 10, calendar: calendar), calendar: calendar)
        #expect(grid.cells.compactMap { $0 }.count == 29)
        #expect(grid.leadingBlankCount == 2)
        #expect(grid.cells.count == 35)
    }

    @Test func gridIsAlwaysWholeWeeks() {
        let calendar = testCalendar()
        for month in 1...12 {
            let grid = MonthGrid(containing: makeDate(2026, month, 1, calendar: calendar), calendar: calendar)
            #expect(grid.cells.count % 7 == 0, "Month \(month) has a partial row")
        }
    }

    @Test func weekdayHeadersFollowFirstWeekday() {
        let sundayFirst = MonthGrid.weekdaySymbols(calendar: testCalendar(firstWeekday: 1))
        let mondayFirst = MonthGrid.weekdaySymbols(calendar: testCalendar(firstWeekday: 2))
        #expect(sundayFirst == ["S", "M", "T", "W", "T", "F", "S"])
        #expect(mondayFirst == ["M", "T", "W", "T", "F", "S", "S"])
    }
}
