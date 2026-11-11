// NumberText.swift
// Converts between numbers and the text you type into number fields.

import Foundation

enum NumberText {
    /// "3.5" → 3.5, "3,5" → 3.5, "" → nil, "abc" → nil
    static func parse(_ text: String) -> Double? {
        let cleaned = text.trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: ",", with: ".")
        guard !cleaned.isEmpty, let value = Double(cleaned), value.isFinite else { return nil }
        return value
    }

    /// 30 → "30", 3.10 → "3.1", 3.14159 → "3.14", nil → ""
    static func format(_ value: Double?) -> String {
        guard let value, value.isFinite else { return "" }
        if value == value.rounded(), abs(value) < 1_000_000_000 {
            return String(Int(value))
        }
        var text = String(format: "%.2f", value)
        while text.hasSuffix("0") { text.removeLast() }
        if text.hasSuffix(".") { text.removeLast() }
        return text
    }
}
