// WorkoutDetailKind.swift
// Decides which optional detail fields an activity shows.

import Foundation

enum WorkoutDetailKind: String, CaseIterable, Identifiable {
    case running        // duration, distance, pace
    case stairMaster    // duration, level, floors
    case strength       // duration, body focus, notes
    case hotYoga        // duration, temperature
    case general        // duration, notes (Yoga, Pilates, Sculpt, custom types)

    var id: String { rawValue }

    /// Human-readable name (used in Settings later when you add a custom activity).
    var displayName: String {
        switch self {
        case .running: "Running-style (distance & pace)"
        case .stairMaster: "Stair climber (level & floors)"
        case .strength: "Strength (body focus)"
        case .hotYoga: "Heated class (temperature)"
        case .general: "General (notes)"
        }
    }
}

/// Choices for "body focus" on strength workouts.
enum BodyFocus {
    static let options = ["Full body", "Upper body", "Lower body", "Glutes", "Arms", "Back", "Core"]
}
