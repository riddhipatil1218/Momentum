// Pace.swift
// Running pace: minutes per mile, and how to display it ("9:30 /mi").

import Foundation

enum Pace {
    /// 30 min over 3 mi → 10.0. Returns nil when either value is missing or zero.
    static func minutesPerMile(durationMinutes: Double?, distanceMiles: Double?) -> Double? {
        guard let minutes = durationMinutes, let miles = distanceMiles,
              minutes > 0, miles > 0 else { return nil }
        return minutes / miles
    }

    /// 9.5 → "9:30 /mi". Rounds to the nearest second (9.999 → "10:00 /mi").
    static func format(minutesPerMile: Double) -> String {
        let totalSeconds = Int((minutesPerMile * 60).rounded())
        return String(format: "%d:%02d /mi", totalSeconds / 60, totalSeconds % 60)
    }
}
