// SeedData.swift
// Fills in the default workout menu and supplement checklist the first time the app runs.

import Foundation
import SwiftData

enum SeedData {
    struct ActivitySeed {
        let name: String
        let symbol: String
        let kind: WorkoutDetailKind
        let healthKitKey: String
    }

    static let activities: [ActivitySeed] = [
        ActivitySeed(name: "Running", symbol: "figure.run", kind: .running, healthKitKey: "running"),
        ActivitySeed(name: "Stair Master", symbol: "figure.stair.stepper", kind: .stairMaster, healthKitKey: "stairClimbing"),
        ActivitySeed(name: "Strength Training", symbol: "figure.strengthtraining.traditional", kind: .strength, healthKitKey: "traditionalStrengthTraining"),
        ActivitySeed(name: "Hot Yoga", symbol: "flame.fill", kind: .hotYoga, healthKitKey: "yoga"),
        ActivitySeed(name: "Yoga", symbol: "figure.yoga", kind: .general, healthKitKey: "yoga"),
        ActivitySeed(name: "Pilates", symbol: "figure.pilates", kind: .general, healthKitKey: "pilates"),
        ActivitySeed(name: "Sculpt", symbol: "figure.core.training", kind: .general, healthKitKey: "functionalStrengthTraining"),
    ]

    static let supplements = [
        "Multivitamin", "Probiotic", "Omega-3", "Collagen",
        "Protein", "Biotin", "Iron", "Creatine",
    ]

    /// Remembers that seeding already happened, so deleted/archived items never come back.
    private static let seededKey = "seed.v1.done"

    static func seedIfNeeded(in context: ModelContext, defaults: UserDefaults = .standard) {
        guard !defaults.bool(forKey: seededKey) else { return }

        // Extra safety: only insert if the tables are actually empty.
        if ((try? context.fetchCount(FetchDescriptor<ActivityType>())) ?? 0) == 0 {
            insertActivities(into: context)
        }
        if ((try? context.fetchCount(FetchDescriptor<Supplement>())) ?? 0) == 0 {
            insertSupplements(into: context)
        }
        try? context.save()
        defaults.set(true, forKey: seededKey)
    }

    static func insertActivities(into context: ModelContext) {
        for (index, seed) in activities.enumerated() {
            context.insert(ActivityType(name: seed.name, symbolName: seed.symbol,
                                        detailKind: seed.kind, healthKitActivityKey: seed.healthKitKey,
                                        sortOrder: index))
        }
    }

    static func insertSupplements(into context: ModelContext) {
        for (index, name) in supplements.enumerated() {
            context.insert(Supplement(name: name, sortOrder: index))
        }
    }
}
