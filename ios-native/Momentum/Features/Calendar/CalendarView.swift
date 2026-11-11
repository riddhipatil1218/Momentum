// CalendarView.swift
// The Calendar tab: a month view with dots (blue = workout, green = supplements),
// a legend with the supplement-dot toggle, and a sheet for any day you tap.

import SwiftUI
import SwiftData

struct CalendarView: View {
    /// Any date inside the month being shown.
    @State private var displayedMonth = Date.now
    @State private var selectedDay: SelectedDay?
    /// Remembered between launches.
    @AppStorage("calendar.showSupplementDots") private var showSupplementDots = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.spacing) {
                    MonthCalendarCard(
                        month: displayedMonth,
                        showSupplementDots: showSupplementDots,
                        onChangeMonth: changeMonth(by:),
                        onSelectDay: { selectedDay = SelectedDay(id: $0) }
                    )
                    .id(DayKey.monthRange(containing: displayedMonth).lowerBound)

                    legend
                }
                .padding(.horizontal, Theme.pagePadding)
                .padding(.bottom, 32)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Calendar")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Today") {
                        withAnimation(.snappy) { displayedMonth = .now }
                    }
                }
            }
            .sheet(item: $selectedDay) { day in
                DayDetailView(dayKey: day.id)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private var legend: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 20) {
                LegendItem(color: Theme.workout, label: "Workout")
                LegendItem(color: Theme.supplement, label: "Supplements")
            }
            Toggle("Show supplement days", isOn: $showSupplementDots)
                .tint(Theme.supplement)
        }
        .card()
    }

    private func changeMonth(by months: Int) {
        if let newMonth = Calendar.current.date(byAdding: .month, value: months, to: displayedMonth) {
            withAnimation(.snappy) { displayedMonth = newMonth }
        }
    }
}

private struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).font(.subheadline).foregroundStyle(.secondary)
        }
    }
}

#Preview {
    CalendarView()
        .modelContainer(.preview)
}
