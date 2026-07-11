// swift-tools-version: 6.3
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "my-simple-calculator",
    dependencies: [
        // SwiftCrossUI + GtkBackend — enables GTK-based GUI windows on Linux/WSL.
        // The real repository is stackotter/swift-cross-ui.
        .package(url: "https://github.com/stackotter/swift-cross-ui", from: "0.8.0")
    ],
    targets: [
        .executableTarget(
            name: "my-simple-calculator",
            dependencies: [
                .product(name: "SwiftCrossUI", package: "swift-cross-ui"),
                .product(name: "GtkBackend",   package: "swift-cross-ui")
            ]
        ),
        .testTarget(
            name: "my-simple-calculatorTests",
            dependencies: ["my-simple-calculator"]
        ),
    ],
    swiftLanguageModes: [.v6]
)
