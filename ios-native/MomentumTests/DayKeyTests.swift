// DayKeyTests.swift
// Checks that dates turn into the right YYYYMMDD day keys, including edge cases
// like midnight, month/year boundaries and daylight-saving changes.

import Foundation
import Testing
@testable import Momentum

/// A fixed calendar (Los Angeles time, US English) so results don't depend on the test machine.
func testCalendar(firstWeekday: Int = 1) -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "America/Los_Angeles")!
    calendar.locale = Locale(identifier: "en_US")
    calendar.firstWeekday = firstWeekday
    return calendar
}

func makeDate(_ year: Int, _ month: Int, _ day: Int,
              hour: Int = 12, minute: Int = 0,
              calendar: Calendar = testCalendar()) -> Date {
    calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour, minute: minute))!
}

@MainActor
struct DayKeyTests {
    let calendar = testCalendar()

    @Test func middayGivesThatDay() {
        #expect(DayKey.make(from: makeDate(2026, 11, 7), calendar: calendar) == 20261107)
    }

    @Test func lateNightStaysOnSameDay() {
        #expect(DayKey.make(from: makeDate(2026, 11, 7, hour: 23, minute: 59), calendar: calendar) == 20261107)
        #expect(DayKey.make(from: makeDate(2026, 11, 8, hour: 0, minute: 0), calendar: calendar) == 20261108)
    }

    @Test func yearBoundary() {
        let newYearsEve = makeDate(2026, 12, 31)
        let nextDay = calendar.date(byAdding: .day, value: 1, to: newYearsEve)!
        #expect(DayKey.make(from: newYearsEve, calendar: calendar) == 20261231)
        #expect(DayKey.make(from: nextDay, calendar: calendar) == 20270101)
    }

    @Test func startOfDayRoundTrip() {
        let start = DayKey.startOfDay(for: 20261107, calendar: calendar)
        #expect(start == makeDate(2026, 11, 7, hour: 0))
        #expect(DayKey.make(from: start, calendar: calendar) == 20261107)
    }

    @Test func pastDayKeepsCurrentClockTime() {
        let now = makeDate(2026, 11, 7, hour: 18, minute: 45)
        let result = DayKey.date(on: 20250315, atTimeOf: now, calendar: calendar)
        let parts = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: result)
        #expect(parts.year == 2025)
        #expect(parts.month == 3)
        #expect(parts.day == 15)
        #expect(parts.hour == 18)
        #expect(parts.minute == 45)
    }

    @Test func monthRangeCoversWholeMonthOnly() {
        let range = DayKey.monthRange(containing: makeDate(2026, 11, 7), calendar: calendar)
        #expect(range == 20261101...20261131)
        #expect(range.contains(20261101))
        #expect(range.contains(20261130))
        #expect(!range.contains(20261031))
        #expect(!range.contains(20261201))
    }

    @Test func daylightSavingChangeDoesNotSkipOrRepeatDays() {
        // US clocks fall back on Nov 1, 2026. Every November day must still appear exactly once.
        let grid = MonthGrid(containing: makeDate(2026, 11, 15), calendar: calendar)
        let keys = grid.cells.compactMap { $0 }.map { DayKey.make(from: $0, calendar: calendar) }
        #expect(keys == Array(20261101...20261130))
    }
}
