> **Parked (unused).** Momentum is now a web app (see ../SPEC.md, D19). This SwiftUI version is kept in case you get an Apple Silicon Mac later.

# Momentum — how to open, run and test

You need a Mac with **Xcode 16 or newer** (free from the Mac App Store).

## One-time setup (about 10 minutes)

1. **Create the empty Xcode project**
   - Open Xcode → *File → New → Project…* → **iOS → App** → Next.
   - Product Name: `Momentum`
   - Team: your Apple ID (add it via *Add Account…* if needed; "Personal Team" is fine)
   - Interface: **SwiftUI** · Language: **Swift**
   - Testing System: **Swift Testing** (tick "include tests" if asked)
   - Storage: **None** (our code sets up SwiftData itself)
   - Click Next and save it somewhere, e.g. your Desktop. You now have `Desktop/Momentum/`.

2. **Swap in the Momentum code**
   - In Finder, open `Desktop/Momentum/Momentum/` and **delete** `ContentView.swift`
     and `MomentumApp.swift` (keep `Assets.xcassets`).
   - Copy everything from this download's `Momentum/Momentum/` folder
     (`App`, `Models`, `Logic`, `Design`, `Features`) into `Desktop/Momentum/Momentum/`.
   - In `Desktop/Momentum/MomentumTests/`, delete the sample test file and copy in the
     three files from this download's `MomentumTests/`.
   - Copy `SPEC.md`, `CLAUDE.md` and `README.md` into `Desktop/Momentum/`.
   - Xcode picks up the new files automatically (they appear in the left sidebar).

3. **Two settings** — click the blue **Momentum** project icon at the top of the sidebar:
   - *General* tab, target **Momentum** → *Minimum Deployments* → **iOS 17.0**.
   - *Build Settings* tab → search **Default Actor Isolation** → set to **nonisolated**.
     Do the same for the **MomentumTests** target. (If you don't see this setting, your
     Xcode is older and you can skip it.)

## Run it
- Pick an iPhone simulator at the top of Xcode (e.g. "iPhone 16") and press **⌘R**.
- On your own iPhone: plug it in, pick it at the top, press ⌘R. The first time, iPhone asks
  you to enable *Settings → Privacy & Security → Developer Mode* and to trust your developer
  profile (*Settings → General → VPN & Device Management*). With a free Apple ID the app
  must be re-run from Xcode every 7 days.

## Test it
- Press **⌘U** (Product → Test). The diamond icons in the test files turn green when passing.
