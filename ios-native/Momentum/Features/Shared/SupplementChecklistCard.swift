// SupplementChecklistCard.swift
// The daily supplement checklist for one day. Tap a row to check/uncheck it.
// Works for today and for past days (from the calendar).

import SwiftUI
import SwiftData

struct SupplementChecklistCard: View {
    let dayKey: Int

    @Environment(\.modelContext) private var modelContext

    /// Active (not archived) supplements, in your chosen order.
    @Query(filter: #Predicate<Supplement> { !$0.isArchived },
           sort: \Supplement.sortOrder)
    private var supplements: [Supplement]

    /// What was taken on this day.
    @Query private var logs: [SupplementLog]

    init(dayKey: Int) {
        self.dayKey = dayKey
        _logs = Query(filter: #Predicate<SupplementLog> { $0.dayKey == dayKey })
    }

    /// IDs of supplements taken on this day, for quick "is it checked?" lookups.
    private var takenIDs: Set<UUID> {
        Set(logs.map(\.supplementID))
    }

    private var takenCount: Int {
        supplements.filter { takenIDs.contains($0.id) }.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Supplements").font(.headline)
                Spacer()
                Text("\(takenCount) of \(supplements.count)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(takenCount == supplements.count && takenCount > 0
                                     ? Theme.supplement : Color.secondary)
            }
            .padding(.bottom, 4)

            ForEach(supplements) { supplement in
                SupplementRow(supplement: supplement,
                              isTaken: takenIDs.contains(supplement.id)) {
                    toggle(supplement)
                }
            }

            if takenCount < supplements.count {
                Button("Check all", systemImage: "checkmark.circle") { checkAll() }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.supplement)
                    .padding(.top, 6)
            }
        }
        .card()
        .sensoryFeedback(.impact(weight: .medium), trigger: takenCount)
    }

    // MARK: - Actions

    private func toggle(_ supplement: Supplement) {
        withAnimation(.snappy) {
            let existing = logs.filter { $0.supplementID == supplement.id }
            if existing.isEmpty {
                modelContext.insert(SupplementLog(supplement: supplement, dayKey: dayKey))
            } else {
                existing.forEach { modelContext.delete($0) }
            }
        }
    }

    private func checkAll() {
        withAnimation(.snappy) {
            for supplement in supplements where !takenIDs.contains(supplement.id) {
                modelContext.insert(SupplementLog(supplement: supplement, dayKey: dayKey))
            }
        }
    }
}

/// One checklist row with a big, easy-to-tap circle.
private struct SupplementRow: View {
    let supplement: Supplement
    let isTaken: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 14) {
                Image(systemName: isTaken ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 28))
                    .foregroundStyle(isTaken ? Theme.supplement : Color.secondary.opacity(0.5))
                    .contentTransition(.symbolEffect(.replace))

                VStack(alignment: .leading, spacing: 1) {
                    Text(supplement.name)
                        .font(.body.weight(.medium))
                        .strikethrough(isTaken, color: .secondary)
                        .foregroundStyle(isTaken ? Color.secondary : Color.primary)
                    if !supplement.doseNote.isEmpty {
                        Text(supplement.doseNote)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
            }
            .padding(.vertical, 7)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(supplement.name), \(isTaken ? "taken" : "not taken")")
    }
}

#Preview {
    ScrollView {
        SupplementChecklistCard(dayKey: DayKey.today()).padding()
    }
    .background(Theme.background)
    .modelContainer(.preview)
}
