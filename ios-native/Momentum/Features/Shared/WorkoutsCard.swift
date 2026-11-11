// WorkoutsCard.swift
// A card listing the workouts logged on one day. Tap a workout to edit it;
// long-press for a quick delete. Used on Today and in the calendar's day sheet.

import SwiftUI
import SwiftData

struct WorkoutsCard: View {
    let emptyMessage: String

    @Environment(\.modelContext) private var modelContext
    @Query private var workouts: [WorkoutLog]
    @State private var editing: WorkoutLog?

    init(dayKey: Int, emptyMessage: String = "No workouts logged.") {
        self.emptyMessage = emptyMessage
        // Only load this day's workouts, oldest first.
        _workouts = Query(filter: #Predicate<WorkoutLog> { $0.dayKey == dayKey },
                          sort: \WorkoutLog.date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Workouts").font(.headline)
                Spacer()
                if !workouts.isEmpty {
                    Text("\(workouts.count)")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.workout)
                }
            }

            if workouts.isEmpty {
                Text(emptyMessage)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 4)
            }

            ForEach(workouts) { workout in
                Button { editing = workout } label: {
                    WorkoutRow(workout: workout)
                }
                .buttonStyle(.plain)
                .contextMenu {
                    Button("Edit", systemImage: "pencil") { editing = workout }
                    Button("Delete", systemImage: "trash", role: .destructive) {
                        withAnimation { modelContext.delete(workout) }
                    }
                }
            }
        }
        .card()
        .sheet(item: $editing) { workout in
            EditWorkoutView(workout: workout)
        }
    }
}

/// One workout: icon, name, details summary, time.
struct WorkoutRow: View {
    let workout: WorkoutLog

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: workout.symbolName)
                .font(.title3)
                .foregroundStyle(Theme.workout)
                .frame(width: 46, height: 46)
                .background(Theme.workout.opacity(0.14),
                            in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(workout.activityName).font(.body.weight(.semibold))
                Text(workout.summaryText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Text(workout.date, format: .dateTime.hour().minute())
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .contentShape(Rectangle())   // makes the whole row tappable, not just the text
    }
}

#Preview {
    ScrollView {
        WorkoutsCard(dayKey: DayKey.today()).padding()
    }
    .background(Theme.background)
    .modelContainer(.preview)
}
