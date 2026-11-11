// DayDetailView.swift
// Sheet shown when you tap a calendar day: that day's workouts (edit, delete, add)
// and its supplement checklist (check/uncheck past days).

import SwiftUI
import SwiftData

struct DayDetailView: View {
    let dayKey: Int

    @Environment(\.dismiss) private var dismiss
    @State private var showingLogSheet = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.spacing) {
                    WorkoutsCard(dayKey: dayKey, emptyMessage: "No workouts this day.")

                    Button {
                        showingLogSheet = true
                    } label: {
                        Label("Log a workout for this day", systemImage: "plus.circle.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .foregroundStyle(Theme.accent)
                            .background(Theme.accent.opacity(0.12),
                                        in: RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    SupplementChecklistCard(dayKey: dayKey)
                }
                .padding(Theme.pagePadding)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(DayKey.startOfDay(for: dayKey)
                .formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showingLogSheet) {
                LogWorkoutSheet(dayKey: dayKey)
            }
        }
    }
}

#Preview {
    DayDetailView(dayKey: DayKey.today())
        .modelContainer(.preview)
}
