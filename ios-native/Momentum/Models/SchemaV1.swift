// SchemaV1.swift
// Version 1 of Momentum's data model.
//
// ⚠️ Once this version has been installed on your phone, NEVER edit it.
// To change the model, copy it into SchemaV2.swift and change it there
// (see CLAUDE.md → "Data safety rules"). That way SwiftData can migrate
// your existing data instead of erasing it.

import Foundation
import SwiftData

enum SchemaV1: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(1, 0, 0) }

    static var models: [any PersistentModel.Type] {
        [ActivityType.self, WorkoutLog.self, Supplement.self, SupplementLog.self]
    }

    // MARK: - ActivityType

    /// One entry in the "Log workout" menu (Running, Yoga, …). Editable in Settings.
    @Model
    final class ActivityType {
        var id: UUID = UUID()
        var name: String = ""
        /// SF Symbol name used as the icon, e.g. "figure.run".
        var symbolName: String = "figure.walk"
        /// Which detail fields to show. Stored as text; see `WorkoutDetailKind`.
        var detailKindRaw: String = WorkoutDetailKind.general.rawValue
        /// Short key we'll later translate into an Apple Health workout type.
        var healthKitActivityKey: String = "other"
        var sortOrder: Int = 0
        var isArchived: Bool = false

        init(name: String,
             symbolName: String,
             detailKind: WorkoutDetailKind,
             healthKitActivityKey: String,
             sortOrder: Int) {
            self.name = name
            self.symbolName = symbolName
            self.detailKindRaw = detailKind.rawValue
            self.healthKitActivityKey = healthKitActivityKey
            self.sortOrder = sortOrder
        }
    }

    // MARK: - WorkoutLog

    /// One workout you logged. Several per day are fine.
    @Model
    final class WorkoutLog {
        var id: UUID = UUID()
        /// Exact moment of the workout.
        var date: Date = Date()
        /// The calendar day as YYYYMMDD (e.g. 20261107). Always set via `move(to:)`.
        var dayKey: Int = 0

        // Copied from the ActivityType when logged, so renaming an activity
        // later never changes your history.
        var activityName: String = ""
        var symbolName: String = "figure.walk"
        var detailKindRaw: String = WorkoutDetailKind.general.rawValue
        var healthKitActivityKey: String = "other"

        // Optional details. `nil` means "not entered".
        var durationMinutes: Double?
        var distanceMiles: Double?      // running
        var stairLevel: Int?            // stair master
        var floors: Int?                // stair master
        var bodyFocus: String?          // strength training
        var temperatureF: Int?          // hot yoga
        var notes: String = ""

        /// Set once this workout has been saved to Apple Health (Milestone 5).
        var healthKitWorkoutID: String?
        var createdAt: Date = Date()

        /// Creates a log by copying the activity's name/icon/kind.
        init(activity: ActivityType, date: Date, calendar: Calendar = .current) {
            self.date = date
            self.dayKey = DayKey.make(from: date, calendar: calendar)
            self.activityName = activity.name
            self.symbolName = activity.symbolName
            self.detailKindRaw = activity.detailKindRaw
            self.healthKitActivityKey = activity.healthKitActivityKey
        }
    }

    // MARK: - Supplement

    /// One item in your daily supplement checklist. Editable in Settings.
    @Model
    final class Supplement {
        var id: UUID = UUID()
        var name: String = ""
        /// Optional, e.g. "2 gummies" or "5 g". Empty string means none.
        var doseNote: String = ""
        var sortOrder: Int = 0
        var isArchived: Bool = false
        var createdAt: Date = Date()

        init(name: String, doseNote: String = "", sortOrder: Int) {
            self.name = name
            self.doseNote = doseNote
            self.sortOrder = sortOrder
        }
    }

    // MARK: - SupplementLog

    /// "I took this supplement on this day." Unchecking deletes the row.
    @Model
    final class SupplementLog {
        var id: UUID = UUID()
        var supplementID: UUID = UUID()
        /// Copy of the name at the time, for history and export.
        var supplementName: String = ""
        var dayKey: Int = 0
        var loggedAt: Date = Date()

        init(supplement: Supplement, dayKey: Int) {
            self.supplementID = supplement.id
            self.supplementName = supplement.name
            self.dayKey = dayKey
        }
    }
}
