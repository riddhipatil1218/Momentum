// RootTabView.swift
// The five bottom tabs. Also fills in default data the very first time the app opens.

import SwiftUI
import SwiftData

struct RootTabView: View {
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.max.fill") }

            CalendarView()
                .tabItem { Label("Calendar", systemImage: "calendar") }

            ComingSoonView(title: "Macros", symbol: "fork.knife",
                           message: "Describe a meal in plain words and get its calories and macros. (Milestone 3)")
                .tabItem { Label("Macros", systemImage: "fork.knife") }

            ComingSoonView(title: "Dashboard", symbol: "chart.bar.fill",
                           message: "Daily macro progress and your 7-day streaks. (Milestone 4)")
                .tabItem { Label("Dashboard", systemImage: "chart.bar.fill") }

            ComingSoonView(title: "Settings", symbol: "gearshape.fill",
                           message: "Your stats, macro targets, supplements and workout types. (Milestone 2)")
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
        .tint(Theme.accent)
        .task {
            SeedData.seedIfNeeded(in: modelContext)
        }
    }
}

#Preview {
    RootTabView()
        .modelContainer(.preview)
}
