import Foundation
import Ignite

@main
struct IgniteWebsite {
    static func main() async {
        var site = MySimpleCalculator()

        do {
            try await site.publish()
        } catch {
            print(error.localizedDescription)
        }
    }
}

struct MySimpleCalculator: Site {    
    var name = "My Simple Calculator"
    var titleSuffix = ""
    var url = URL(static: "https://www.example.com")
    var builtInIconsEnabled = true

    var author = "Z. Sūn"

    var homePage = Home()
    var layout = MainLayout()
}
