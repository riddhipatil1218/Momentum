// DayKey.swift
// Converts dates to/from a "day key": an integer like 20261107 meaning Nov 7, 2026.
// Storing days this way keeps a workout on the day you logged it, even if you travel
// across time zones, and makes "everything on this day/month" queries simple.

import Foundation

enum DayKey {
    /// 2026-11-07 at any time → 20261107
    static func make(from date: Date, calendar: Calendar = .current) -> Int {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return (parts.year ?? 0) * 10_000 + (parts.month ?? 0) * 100 + (parts.day ?? 0)
    }

    /// Today's key.
    static func today(calendar: Calendar = .current) -> Int {
        make(from: .now, calendar: calendar)
    }

    /// 20261107 → year 2026, month 11, day 7
    static func components(of key: Int) -> DateComponents {
        DateComponents(year: key / 10_000, month: (key / 100) % 100, day: key % 100)
    }

    /// 20261107 → Nov 7, 2026 at midnight.
    static func startOfDay(for key: Int, calendar: Calendar = .current) -> Date {
        calendar.date(from: components(of: key)) ?? .now
    }

    /// The date of `key` combined with the clock time of `time`.
    /// Used when you log a workout onto a past day from the calendar.
    static func date(on key: Int, atTimeOf time: Date, calendar: Calendar = .current) -> Date {
        var parts = components(of: key)
        let clock = calendar.dateComponents([.hour, .minute, .second], from: time)
        parts.hour = clock.hour
        parts.minute = clock.minute
        parts.second = clock.second
        return calendar.date(from: parts) ?? startOfDay(for: key, calendar: calendar)
    }

    /// Every key that could belong to the month containing `date`.
    /// Nov 2026 → 20261101...20261131. (Day 31 doesn't exist in November,
    /// but no real key falls in that gap, so the range is still exact.)
    static func monthRange(containing date: Date, calendar: Calendar = .current) -> ClosedRange<Int> {
        let parts = calendar.dateComponents([.year, .month], from: date)
        let base = (parts.year ?? 0) * 10_000 + (parts.month ?? 0) * 100
        return (base + 1)...(base + 31)
    }
}

/// Wraps a day key so SwiftUI's `.sheet(item:)` can present it.
struct SelectedDay: Identifiable, Hashable {
    let id: Int   // the day key
}
