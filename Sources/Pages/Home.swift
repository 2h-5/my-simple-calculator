import Foundation
import Ignite

// @author 🆉. Sūn
struct Home: StaticPage {
    var title = "🆉 Simple Calculator"

    var body: some HTML {
        Include("calculator.xhtml")
    }
}
