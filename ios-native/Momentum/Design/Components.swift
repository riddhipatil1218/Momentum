// Components.swift
// Small reusable pieces: chips, number input fields, the keyboard "Done" button.

import SwiftUI
import UIKit

// MARK: - Chip

/// A rounded pill button, highlighted when selected.
struct Chip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Theme.accent : Theme.subtleFill, in: Capsule())
                .foregroundStyle(isSelected ? Color.white : Color.primary)
        }
        .buttonStyle(.plain)   // so tapping one chip in a Form row doesn't tap them all
    }
}

/// A horizontal row of chips where one (or none) can be selected. Tapping the selected chip clears it.
struct ChipPicker: View {
    let options: [String]
    @Binding var selection: String?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { option in
                    Chip(title: option, isSelected: selection == option) {
                        selection = (selection == option) ? nil : option
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Number field

/// "Title ........ [ 45 ] min" — a number input that saves as you type.
/// Empty text means "not entered" (nil).
struct NumberField: View {
    let title: String
    @Binding var value: Double?
    var unit: String = ""
    var allowsDecimal = true

    @State private var text = ""

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            TextField("—", text: $text)
                .keyboardType(allowsDecimal ? .decimalPad : .numberPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 90)
            if !unit.isEmpty {
                Text(unit).foregroundStyle(.secondary)
            }
        }
        .onAppear { text = NumberText.format(value) }
        // Typing → update the stored value.
        .onChange(of: text) { _, newText in
            let parsed = NumberText.parse(newText).map { allowsDecimal ? $0 : $0.rounded() }
            if parsed != value { value = parsed }
        }
        // Value changed elsewhere (e.g. a quick-pick chip) → update the text.
        .onChange(of: value) { _, newValue in
            if NumberText.parse(text) != newValue { text = NumberText.format(newValue) }
        }
    }
}

extension Binding where Value == Int? {
    /// Lets an `Int?` property be edited with `NumberField` (which works in Doubles).
    var asDouble: Binding<Double?> {
        Binding<Double?>(
            get: { wrappedValue.map(Double.init) },
            // Ignore absurd numbers instead of crashing on them.
            set: { wrappedValue = $0.flatMap { abs($0) < 1_000_000 ? Int($0) : nil } }
        )
    }
}

// MARK: - Keyboard

extension View {
    /// Adds a "Done" button above the keyboard (number pads have no return key).
    func keyboardDoneButton() -> some View {
        toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder),
                                                    to: nil, from: nil, for: nil)
                }
            }
        }
    }
}
