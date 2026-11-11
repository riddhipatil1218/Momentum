// PaceAndNumberTests.swift
// Checks running pace math/formatting and the number ⇄ text conversion used by input fields.

import Foundation
import Testing
@testable import Momentum

@MainActor
struct PaceTests {

    @Test func paceIsMinutesDividedByMiles() {
        #expect(Pace.minutesPerMile(durationMinutes: 30, distanceMiles: 3) == 10)
    }

    @Test func paceNeedsBothValues() {
        #expect(Pace.minutesPerMile(durationMinutes: 30, distanceMiles: nil) == nil)
        #expect(Pace.minutesPerMile(durationMinutes: nil, distanceMiles: 3) == nil)
        #expect(Pace.minutesPerMile(durationMinutes: 30, distanceMiles: 0) == nil)
    }

    @Test func paceFormatting() {
        #expect(Pace.format(minutesPerMile: 9.5) == "9:30 /mi")
        #expect(Pace.format(minutesPerMile: 8) == "8:00 /mi")
        #expect(Pace.format(minutesPerMile: 9.999) == "10:00 /mi")   // rounds up cleanly
    }
}

@MainActor
struct NumberTextTests {

    @Test func parsing() {
        #expect(NumberText.parse("3.5") == 3.5)
        #expect(NumberText.parse("3,5") == 3.5)
        #expect(NumberText.parse(" 45 ") == 45)
        #expect(NumberText.parse("") == nil)
        #expect(NumberText.parse("abc") == nil)
    }

    @Test func formatting() {
        #expect(NumberText.format(30) == "30")
        #expect(NumberText.format(3.1) == "3.1")
        #expect(NumberText.format(3.14159) == "3.14")
        #expect(NumberText.format(nil) == "")
    }
}
