// ModelHelpers.swift
// Small conveniences on the data models: display text, pace, moving a workout.
// These are computed, not stored, so they don't affect the database.

import Foundation

extension WorkoutLog {
    var detailKind: WorkoutDetailKind {
        WorkoutDetailKind(rawValue: detailKindRaw) ?? .general
    }

    /// Minutes per mile, or nil if duration/distance are missing.
    var paceMinutesPerMile: Double? {
        Pace.minutesPerMile(durationMinutes: durationMinutes, distanceMiles: distanceMiles)
    }

    /// Changes the workout's time and keeps `dayKey` in sync. Always use this instead of setting `date`.
    func move(to newDate: Date, calendar: Calendar = .current) {
        date = newDate
        dayKey = DayKey.make(from: newDate, calendar: calendar)
    }

    /// One-line summary shown under the workout name, e.g. "45 min · 3.1 mi · 9:41 /mi".
    var summaryText: String {
        var parts: [String] = []
        if let minutes = durationMinutes {
            parts.append("\(NumberText.format(minutes)) min")
        }
        switch detailKind {
        case .running:
            if let miles = distanceMiles { parts.append("\(NumberText.format(miles)) mi") }
            if let pace = paceMinutesPerMile { parts.append(Pace.format(minutesPerMile: pace)) }
        case .stairMaster:
            if let level = stairLevel { parts.append("Level \(level)") }
            if let floors { parts.append("\(floors) floors") }
        case .strength:
            if let bodyFocus { parts.append(bodyFocus) }
        case .hotYoga:
            if let temperatureF { parts.append("\(temperatureF)°F") }
        case .general:
            break
        }
        if parts.isEmpty && !notes.isEmpty { parts.append(notes) }
        return parts.isEmpty ? "Tap to add details" : parts.joined(separator: " · ")
    }
}
