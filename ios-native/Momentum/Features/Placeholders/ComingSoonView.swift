// ComingSoonView.swift
// Temporary screen for tabs that later milestones will build (Macros, Dashboard, Settings).

import SwiftUI

struct ComingSoonView: View {
    let title: String
    let symbol: String
    let message: String

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: symbol)
                    .font(.system(size: 54))
                    .foregroundStyle(Theme.accent)
                Text("Coming soon")
                    .font(.title2.bold())
                Text(message)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 40)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(title)
        }
    }
}

#Preview {
    ComingSoonView(title: "Macros", symbol: "fork.knife", message: "Describe a meal and get its macros.")
}
