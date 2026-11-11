// MigrationPlan.swift
// The numbered list of data-model versions and how to move between them.
//
// When we add SchemaV2 later:
//   1. add `SchemaV2.self` to `schemas` (keep V1!),
//   2. add a stage like `.lightweight(fromVersion: SchemaV1.self, toVersion: SchemaV2.self)`,
//   3. change `CurrentSchema` below to `SchemaV2`.

import SwiftData

enum MomentumMigrationPlan: SchemaMigrationPlan {
    /// Every version that has ever existed, oldest first.
    static var schemas: [any VersionedSchema.Type] {
        [SchemaV1.self]
    }

    /// Steps between consecutive versions. Empty while there is only V1.
    static var stages: [MigrationStage] {
        []
    }
}

// MARK: - "Current" names used by the rest of the app

/// The schema version the app is using right now.
typealias CurrentSchema = SchemaV1

// Short names so views can say `WorkoutLog` instead of `SchemaV1.WorkoutLog`.
typealias ActivityType = CurrentSchema.ActivityType
typealias WorkoutLog = CurrentSchema.WorkoutLog
typealias Supplement = CurrentSchema.Supplement
typealias SupplementLog = CurrentSchema.SupplementLog

extension ModelContainer {
    /// Opens (or creates) Momentum's database on the phone.
    static func makeMomentum(inMemory: Bool = false) throws -> ModelContainer {
        let configuration = inMemory
            ? ModelConfiguration(isStoredInMemoryOnly: true)
            : ModelConfiguration("Momentum")   // ⚠️ never rename: this is the file name
        return try ModelContainer(
            for: Schema(versioned: CurrentSchema.self),
            migrationPlan: MomentumMigrationPlan.self,
            configurations: configuration
        )
    }
}
