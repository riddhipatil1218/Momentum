// PreviewData.swift
// A throwaway in-memory database with sample data, used only by Xcode's #Preview canvas.
// Nothing here touches your real data.

import Foundation
import SwiftData

extension ModelContainer {
    @MainActor
    static let preview: ModelContainer = {
        do {
            let container = try ModelContainer.makeMomentum(inMemory: true)
            let context = container.mainContext
            SeedData.insertActivities(into: context)
            SeedData.insertSupplements(into: context)

            // A few sample workouts this month so the calendar has dots.
            let activities = (try? context.fetch(FetchDescriptor<ActivityType>(sortBy: [SortDescriptor(\.sortOrder)]))) ?? []
            let calendar = Calendar.current
            for (offset, activity) in zip([0, 2, 3, 6], activities) {
                let date = calendar.date(byAdding: .day, value: -offset, to: .now) ?? .now
                let log = WorkoutLog(activity: activity, date: date)
                log.durationMinutes = 45
                if activity.detailKindRaw == WorkoutDetailKind.running.rawValue { log.distanceMiles = 3.1 }
                context.insert(log)
            }
            return container
        } catch {
            fatalError("Preview database failed: \(error)")
        }
    }()
}
