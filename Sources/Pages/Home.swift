import Foundation
import Ignite

struct Home: StaticPage {
    var title = "My Simple Calculator"

    var body: some HTML {
        Include("calculator.xhtml")
    }
}