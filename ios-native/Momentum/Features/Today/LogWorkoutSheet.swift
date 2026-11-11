// LogWorkoutSheet.swift
// Step 1: a grid of big activity tiles. Tapping one logs it immediately (with a haptic).
// Step 2: a confirmation screen with optional "Add details", "Log another" and "Undo".

import SwiftUI
import SwiftData

struct LogWorkoutSheet: View {
    /// Which day to log onto (today, or a day picked in the calendar).
    let dayKey: Int

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(filter: #Predicate<ActivityType> { !$0.isArchived },
           sort: \ActivityType.sortOrder)
    private var activities: [ActivityType]

    /// The workout just logged. nil = still choosing.
    @State private var logged: WorkoutLog?
    @State private var showDetails = false

    private let columns = [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)]

    var body: some View {
        NavigationStack {
            Group {
                if let logged {
                    confirmation(for: logged)
                } else {
                    activityGrid
                }
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: logged == nil ? .cancellationAction : .confirmationAction) {
                    Button(logged == nil ? "Cancel" : "Done") { dismiss() }
                        .fontWeight(logged == nil ? .regular : .semibold)
                }
            }
            .keyboardDoneButton()
        }
        .sensoryFeedback(.success, trigger: logged?.id) { _, new in new != nil }
    }

    // MARK: - Step 1: pick an activity

    private var activityGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(activities) { activity in
                    Button { log(activity) } label: {
                        VStack(spacing: 10) {
                            Image(systemName: activity.symbolName)
                                .font(.system(size: 34))
                                .foregroundStyle(Theme.accent)
                            Text(activity.name)
                                .font(.headline)
                                .multilineTextAlignment(.center)
                                .foregroundStyle(.primary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 120)
                        .padding(.horizontal, 8)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous))
                        .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(Theme.pagePadding)
        }
        .navigationTitle(isToday ? "Log workout" : "Log for \(dayTitle)")
    }

    // MARK: - Step 2: confirmation + optional details

    private func confirmation(for workout: WorkoutLog) -> some View {
        Form {
            Section {
                VStack(spacing: 10) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(Theme.supplement)
                        .symbolEffect(.bounce, value: workout.id)
                    Text("\(workout.activityName) logged")
                        .font(.title2.bold())
                    Text(isToday ? "Nice work today! 🎉" : "Added to \(dayTitle)")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .listRowBackground(Color.clear)
            }

            // The optional, expandable details section.
            Section {
                Button {
                    withAnimation { showDetails.toggle() }
                } label: {
                    HStack {
                        Label("Add details", systemImage: "slider.horizontal.3")
                        Text("optional").foregroundStyle(.secondary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .rotationEffect(.degrees(showDetails ? 180 : 0))
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if showDetails {
                WorkoutDetailFields(workout: workout)
            }

            Section {
                Button("Log another workout", systemImage: "plus") {
                    withAnimation {
                        logged = nil
                        showDetails = false
                    }
                }
                Button("Undo", systemImage: "arrow.uturn.backward", role: .destructive) {
                    undo(workout)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle("")
    }

    // MARK: - Actions

    private func log(_ activity: ActivityType) {
        // For today: right now. For a past day: that day at the current clock time.
        let date = isToday ? Date.now : DayKey.date(on: dayKey, atTimeOf: .now)
        let workout = WorkoutLog(activity: activity, date: date)
        modelContext.insert(workout)
        withAnimation(.snappy) { logged = workout }
    }

    private func undo(_ workout: WorkoutLog) {
        withAnimation {
            logged = nil          // leave the confirmation screen first…
            showDetails = false
        }
        modelContext.delete(workout)   // …then remove the workout
    }

    // MARK: - Helpers

    private var isToday: Bool { dayKey == DayKey.today() }

    private var dayTitle: String {
        DayKey.startOfDay(for: dayKey).formatted(.dateTime.month(.abbreviated).day())
    }
}

#Preview {
    LogWorkoutSheet(dayKey: DayKey.today())
        .modelContainer(.preview)
}
