import Foundation
import Ignite

struct Home: StaticPage {
    var title = "🆉 Simple Calculator"

    var body: some HTML {
        Include("calculator.xhtml")
    }
}
