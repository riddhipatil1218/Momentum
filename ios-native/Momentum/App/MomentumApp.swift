// MomentumApp.swift
// App entry point: opens the on-phone database and shows the tabs.

import SwiftUI
import SwiftData

@main
struct MomentumApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer.makeMomentum()
        } catch {
            // Deliberately stop instead of wiping the database (see SPEC.md, D5).
            fatalError("Momentum couldn't open its database: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
        }
        .modelContainer(container)
    }
}
