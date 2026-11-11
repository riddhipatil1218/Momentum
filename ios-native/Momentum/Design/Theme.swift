// Theme.swift
// Momentum's colors, spacing and card style. Every color has a light and a dark version.

import SwiftUI
import UIKit

enum Theme {
    // Backgrounds
    static let background = Color(light: 0xFBF6F0, dark: 0x1C1917)    // warm cream / deep brown-black
    static let card = Color(light: 0xFFFFFF, dark: 0x292524)
    static let subtleFill = Color(light: 0xF3EADF, dark: 0x3A3330)    // chips, icon backgrounds

    // Accents
    static let accent = Color(light: 0xD9694C, dark: 0xF08C70)        // warm coral
    static let workout = Color(light: 0x4A86E8, dark: 0x6FA0F0)       // soft blue (workout dots)
    static let supplement = Color(light: 0x5FA36C, dark: 0x8CC796)    // sage green (supplement dots)

    // Shape & spacing
    static let cornerRadius: CGFloat = 22
    static let spacing: CGFloat = 20
    static let pagePadding: CGFloat = 20
}

extension Color {
    /// A color that switches automatically between light and dark mode. Hex like 0xD9694C.
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255,
                  green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255,
                  alpha: 1)
    }
}

/// White rounded card with a soft shadow. Use with `.card()`.
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 10, y: 4)
    }
}

extension View {
    func card() -> some View { modifier(CardStyle()) }
}
