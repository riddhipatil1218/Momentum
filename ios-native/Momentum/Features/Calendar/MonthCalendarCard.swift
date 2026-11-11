// MonthCalendarCard.swift
// One month of the calendar: header with arrows, weekday letters, and the day grid.
// Swipe left/right to change month. Only this month's logs are loaded.

import SwiftUI
import SwiftData

struct MonthCalendarCard: View {
    let showSupplementDots: Bool
    let onChangeMonth: (Int) -> Void
    let onSelectDay: (Int) -> Void

    private let grid: MonthGrid
    private let monthTitle: String

    @Query private var workouts: [WorkoutLog]
    @Query private var supplementLogs: [SupplementLog]

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)

    init(month: Date,
         showSupplementDots: Bool,
         onChangeMonth: @escaping (Int) -> Void,
         onSelectDay: @escaping (Int) -> Void) {
        self.showSupplementDots = showSupplementDots
        self.onChangeMonth = onChangeMonth
        self.onSelectDay = onSelectDay
        self.grid = MonthGrid(containing: month)
        self.monthTitle = month.formatted(.dateTime.month(.wide).year())

        // Load only logs whose day key falls inside this month.
        let range = DayKey.monthRange(containing: month)
        let first = range.lowerBound
        let last = range.upperBound
        _workouts = Query(filter: #Predicate<WorkoutLog> { $0.dayKey >= first && $0.dayKey <= last })
        _supplementLogs = Query(filter: #Predicate<SupplementLog> { $0.dayKey >= first && $0.dayKey <= last })
    }

    // Days that get a dot.
    private var workoutDays: Set<Int> { Set(workouts.map(\.dayKey)) }
    private var supplementDays: Set<Int> { Set(supplementLogs.map(\.dayKey)) }

    var body: some View {
        VStack(spacing: 14) {
            header
            weekdayRow
            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(Array(grid.cells.enumerated()), id: \.offset) { _, date in
                    if let date {
                        let key = DayKey.make(from: date)
                        DayCell(date: date,
                                isToday: key == DayKey.today(),
                                isFuture: key > DayKey.today(),
                                hasWorkout: workoutDays.contains(key),
                                hasSupplements: showSupplementDots && supplementDays.contains(key)) {
                            onSelectDay(key)
                        }
                    } else {
                        Color.clear.frame(height: 50)
                    }
                }
            }
            summary
        }
        .card()
        .contentShape(Rectangle())
        // "simultaneous" so the swipe never blocks vertical scrolling or day taps.
        .simultaneousGesture(
            DragGesture(minimumDistance: 30)
                .onEnded { value in
                    // Only react to mostly-horizontal swipes.
                    guard abs(value.translation.width) > abs(value.translation.height) else { return }
                    if value.translation.width < -50 { onChangeMonth(1) }
                    if value.translation.width > 50 { onChangeMonth(-1) }
                }
        )
    }

    private var header: some View {
        HStack {
            Button { onChangeMonth(-1) } label: {
                Image(systemName: "chevron.left").frame(width: 44, height: 44)
            }
            Spacer()
            Text(monthTitle).font(.title3.bold())
            Spacer()
            Button { onChangeMonth(1) } label: {
                Image(systemName: "chevron.right").frame(width: 44, height: 44)
            }
        }
        .font(.headline)
        .tint(Theme.accent)
    }

    private var weekdayRow: some View {
        HStack(spacing: 0) {
            ForEach(Array(MonthGrid.weekdaySymbols().enumerated()), id: \.offset) { _, symbol in
                Text(symbol)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var summary: some View {
        let count = workouts.count
        let activeDays = workoutDays.count
        return Text(count == 0
                    ? "No workouts this month yet"
                    : "\(count) workout\(count == 1 ? "" : "s") on \(activeDays) day\(activeDays == 1 ? "" : "s") this month")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .padding(.top, 4)
    }
}

/// One day: the number (circled in coral if today) with up to two dots underneath.
private struct DayCell: View {
    let date: Date
    let isToday: Bool
    let isFuture: Bool
    let hasWorkout: Bool
    let hasSupplements: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                Text(date, format: .dateTime.day())
                    .font(.callout.weight(isToday ? .bold : .regular))
                    .monospacedDigit()
                    .frame(width: 36, height: 36)
                    .background(Circle().fill(isToday ? Theme.accent : Color.clear))
                    .foregroundStyle(isToday ? Color.white : (isFuture ? Color.secondary : Color.primary))

                HStack(spacing: 3) {
                    if hasWorkout {
                        Circle().fill(Theme.workout).frame(width: 6, height: 6)
                    }
                    if hasSupplements {
                        Circle().fill(Theme.supplement).frame(width: 6, height: 6)
                    }
                }
                .frame(height: 6)
            }
            .frame(maxWidth: .infinity, minHeight: 50)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityText)
    }

    private var accessibilityText: String {
        var text = date.formatted(.dateTime.weekday(.wide).month(.wide).day())
        if hasWorkout { text += ", workout logged" }
        if hasSupplements { text += ", supplements logged" }
        return text
    }
}
