// WorkoutDetailFields.swift
// The optional detail fields for a workout. Which fields appear depends on the activity:
//   Running: distance + calculated pace · Stair Master: level, floors
//   Strength: body focus, notes · Hot Yoga: temperature · others: notes
// All of them get duration. Used inside a Form (logging confirmation and edit screen).

import SwiftUI

struct WorkoutDetailFields: View {
    @Bindable var workout: WorkoutLog

    private let durationPresets: [Double] = [20, 30, 45, 60, 75]

    var body: some View {
        Section("Duration") {
            NumberField(title: "Duration", value: $workout.durationMinutes, unit: "min")
            // One-tap presets for the usual class lengths.
            HStack(spacing: 8) {
                ForEach(durationPresets, id: \.self) { minutes in
                    Chip(title: NumberText.format(minutes), isSelected: workout.durationMinutes == minutes) {
                        workout.durationMinutes = minutes
                    }
                }
            }
        }

        switch workout.detailKind {
        case .running:
            Section("Run") {
                NumberField(title: "Distance", value: $workout.distanceMiles, unit: "mi")
                LabeledContent("Pace") {
                    Text(workout.paceMinutesPerMile.map { Pace.format(minutesPerMile: $0) } ?? "—")
                        .monospacedDigit()
                }
            }

        case .stairMaster:
            Section("Effort") {
                NumberField(title: "Level", value: $workout.stairLevel.asDouble, allowsDecimal: false)
                NumberField(title: "Floors", value: $workout.floors.asDouble, allowsDecimal: false)
            }

        case .strength:
            Section("Body focus") {
                ChipPicker(options: BodyFocus.options, selection: $workout.bodyFocus)
            }
            notesSection

        case .hotYoga:
            Section("Room") {
                NumberField(title: "Temperature", value: $workout.temperatureF.asDouble,
                            unit: "°F", allowsDecimal: false)
            }

        case .general:
            notesSection
        }
    }

    private var notesSection: some View {
        Section("Notes") {
            TextField("How did it feel?", text: $workout.notes, axis: .vertical)
                .lineLimit(2...6)
        }
    }
}
