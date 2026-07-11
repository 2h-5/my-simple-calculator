// swift-tools-version: 6.3
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "MySimpleCalculator",
    platforms: [.macOS(.v13)],
    dependencies: [
        // SwiftCrossUI + GtkBackend — enables GTK-based GUI windows on Linux/WSL.
        // The real repository is stackotter/swift-cross-ui.
        .package(url: "https://github.com/stackotter/swift-cross-ui", from: "0.8.0")
    ],
    targets: [
        .executableTarget(
            name: "MySimpleCalculator",
            dependencies: ["Ignite"]),
    ]
)
