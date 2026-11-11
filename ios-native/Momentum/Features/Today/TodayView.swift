// TodayView.swift
// The Today tab: greeting, the big "Log workout" button, today's workouts,
// and the supplement checklist.

import SwiftUI
import SwiftData
import Combine

struct TodayView: View {
    @State private var todayKey = DayKey.today()
    @State private var showingLogSheet = false
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.spacing) {
                    header
                    logWorkoutButton
                    WorkoutsCard(dayKey: todayKey, emptyMessage: "Nothing yet today — you've got this.")
                    SupplementChecklistCard(dayKey: todayKey)
                }
                .padding(.horizontal, Theme.pagePadding)
                .padding(.bottom, 32)
                .id(todayKey)   // rebuild cleanly when the day changes
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Today")
            .sheet(isPresented: $showingLogSheet) {
                LogWorkoutSheet(dayKey: todayKey)
            }
            // Roll over to the new day after midnight or when you reopen the app.
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { todayKey = DayKey.today() }
            }
            .onReceive(NotificationCenter.default.publisher(for: .NSCalendarDayChanged)
                .receive(on: DispatchQueue.main)) { _ in
                todayKey = DayKey.today()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(Date.now, format: .dateTime.weekday(.wide).month(.wide).day())
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            Text(greeting)
                .font(.title3.weight(.semibold))
        }
        .padding(.top, 4)
    }

    private var greeting: String {
        switch Calendar.current.component(.hour, from: .now) {
        case 5..<12: "Good morning ☀️"
        case 12..<17: "Good afternoon 🌿"
        default: "Good evening 🌙"
        }
    }

    private var logWorkoutButton: some View {
        Button {
            showingLogSheet = true
        } label: {
            HStack(spacing: 14) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 30))
                Text("Log workout")
                    .font(.title3.bold())
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.headline)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 22)
            .padding(.vertical, 24)
            .background(Theme.accent.gradient,
                        in: RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous))
            .shadow(color: Theme.accent.opacity(0.3), radius: 12, y: 6)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    TodayView()
        .modelContainer(.preview)
}
