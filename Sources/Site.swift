import Foundation
import Ignite

@main
struct IgniteWebsite {
    static func main() async {
        var site = ExampleSite()

        do {
            try await site.publish()
        } catch {
            print(error.localizedDescription)
        }
    }
}

// @author 🆉. Sūn
struct ExampleSite: Site {    
    var name = "🆉 Simple Calculator"
    var titleSuffix = ""
    var url = URL(static: "https://2h-5.github.io/my-simple-calculator")
    var builtInIconsEnabled = true

    var author = "Z. Sūn"

    var homePage = Home()
    var layout = MainLayout()
}
