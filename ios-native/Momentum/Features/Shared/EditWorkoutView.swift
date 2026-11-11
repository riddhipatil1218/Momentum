// EditWorkoutView.swift
// Sheet for changing a logged workout's time and details, or deleting it.
// Changes save automatically as you type (SwiftData autosaves).

import SwiftUI
import SwiftData

struct EditWorkoutView: View {
    @Bindable var workout: WorkoutLog

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @State private var showDeleteConfirmation = false
    @State private var shouldDelete = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label(workout.activityName, systemImage: workout.symbolName)
                        .font(.headline)
                    DatePicker("When", selection: dateBinding)
                }

                WorkoutDetailFields(workout: workout)

                Section {
                    Button("Delete workout", role: .destructive) {
                        showDeleteConfirmation = true
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Edit workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .keyboardDoneButton()
            .confirmationDialog("Delete this \(workout.activityName) workout?",
                                isPresented: $showDeleteConfirmation,
                                titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    shouldDelete = true
                    dismiss()
                }
            }
        }
        // Delete only after the sheet has closed, so the screen never shows a deleted workout.
        .onDisappear {
            if shouldDelete { modelContext.delete(workout) }
        }
    }

    /// Changing the date also updates which calendar day the workout belongs to.
    private var dateBinding: Binding<Date> {
        Binding(get: { workout.date }, set: { workout.move(to: $0) })
    }
}

#Preview {
    let container = ModelContainer.preview
    let workout = try! container.mainContext.fetch(FetchDescriptor<WorkoutLog>()).first!
    return EditWorkoutView(workout: workout)
        .modelContainer(container)
}
