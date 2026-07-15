import SwiftCrossUI
import GtkBackend
import Foundation

// ---------------------------------------------------------------------------
// MARK: - Color palette  (matches style.css exactly)
// ---------------------------------------------------------------------------

extension Color {
    static let calcBody     = Color(red: 139/255, green: 145/255, blue: 152/255) // #8b9198
    static let screenBg     = Color(red:  70/255, green: 199/255, blue: 241/255) // #46c7f1
    static let screenBorder = Color(red:   0/255, green: 153/255, blue: 204/255) // #0099cc
    static let numBtn       = Color(red: 211/255, green: 219/255, blue: 226/255) // #d3dbe2
    static let fnBtn        = Color(red:  51/255, green:  51/255, blue:  51/255) // #333333
    static let opBtn        = Color(red:  31/255, green:  78/255, blue: 143/255) // #1f4e8f
    static let opBtnActive  = Color(red:  58/255, green: 109/255, blue: 179/255) // #3a6db3
    static let numText      = Color(red:  17/255, green:  17/255, blue:  17/255) // #111111
    static let lightText    = Color(red: 255/255, green: 255/255, blue: 255/255) // #ffffff
    static let segOn        = Color(red:  10/255, green:  10/255, blue:  10/255) // #0a0a0a
}

// ---------------------------------------------------------------------------
// MARK: - Calculator engine  (direct port of script.js)
// ---------------------------------------------------------------------------

struct CalcState {

    var display      = "0"
    var startNew     = true // © 🆉. Sūn 2026 All rights reserved
    var awaitingOp   = false
    var acc:    Double? = nil
    var addOp:  String? = nil
    var term:   Double? = nil
    var mulOp:  String? = nil
    var lastOp:      String? = nil
    var lastOperand: Double? = nil
    var repeatReady  = false

    struct BracketFrame {
        var acc: Double?; var addOp: String?
        var term: Double?; var mulOp: String?
    }
    var bracketStack: [BracketFrame] = []

    static let maxDigits = 10

    // ---- helpers ----

    func digitCount(_ s: String) -> Int { s.filter { $0.isNumber }.count }

    func compute(_ a: Double, _ op: String, _ b: Double) -> Double {
        switch op {
        case "+": return a + b
        case "-": return a - b
        case "*": return a * b
        case "/": return b == 0 ? Double.infinity : a / b
        default:  return b
        }
    }

    func formatResult(_ num: Double) -> String { // © Z. Sūn 2026 All rights reserved
        if !num.isFinite             { return "Error" }
        if abs(num) > 9_999_999_999 { return "Error" }
        if num == Double(Int(num))   { return String(Int(num)) }
        let sign      = num < 0 ? "-" : ""
        let absVal    = abs(num)
        let intStr    = String(Int(floor(absVal)))
        let intDigits = intStr.count
        let decimals  = Self.maxDigits - intDigits
        if decimals <= 0 { return sign + intStr }
        let factor    = pow(10.0, Double(decimals))
        let truncated = floor(absVal * factor) / factor
        var str       = String(format: "%.\(decimals)f", truncated)
        while str.hasSuffix("0") { str.removeLast() }
        if str.hasSuffix(".")    { str.removeLast() }
        return sign + str
    }

    // ---- input handlers ----

    mutating func inputDigit(_ d: String) {
        guard display != "Error" else { return }
        repeatReady = false
        if startNew {
            display = d; startNew = false
        } else {
            if digitCount(display) >= Self.maxDigits { return }
            if display == "0"       { display = d }
            else if display == "-0" { display = "-" + d }
            else                    { display += d }
        }
        awaitingOp = false
    }

    mutating func inputDecimal() {
        guard display != "Error" else { return }
        repeatReady = false
        if startNew {
            display = "0."; startNew = false
        } else if !display.contains(".") {
            display += "."
        }
        awaitingOp = false
    }

    mutating func negate() {
        guard display != "Error" else { return }
        repeatReady = false
        guard let v = Double(display), v != 0 else { return }
        display = display.hasPrefix("-") ? String(display.dropFirst()) : "-" + display
    }

    mutating func del() {
        guard display != "Error", !startNew else { return }
        repeatReady = false
        var s = String(display.dropLast())
        if s.isEmpty || s == "-" { s = "0" }
        display = s
    }

    mutating func clearAll() {
        display = "0"; acc = nil; addOp = nil; term = nil; mulOp = nil
        startNew = true; awaitingOp = false; bracketStack = []
        lastOp = nil; lastOperand = nil; repeatReady = false
    }

    /// Returns the newly-active operator string (for highlight), or nil.
    mutating func pressOperator(_ op: String) -> String? {
        guard display != "Error" else { return nil }
        repeatReady = false

        if awaitingOp {
            let v = Double(display) ?? 0
            if op == "+" || op == "-" { acc = v; addOp = op; term = nil; mulOp = nil }
            else                      { term = v; mulOp = op; acc = nil; addOp = nil }
            return op
        }

        let entry = Double(display) ?? 0
        if op == "*" || op == "/" {
            if let mOp = mulOp, let t = term {
                let r = compute(t, mOp, entry)
                let f = formatResult(r); display = f
                if f == "Error" { return nil }
                term = Double(f)
            } else {
                term = entry
            }
            mulOp = op
        } else {
            let curTerm = (mulOp != nil && term != nil) ? compute(term!, mulOp!, entry) : entry
            if let aOp = addOp, let a = acc {
                let r = compute(a, aOp, curTerm); let f = formatResult(r)
                display = f; if f == "Error" { return nil }; acc = Double(f)
            } else {
                acc = curTerm
                let f = formatResult(curTerm); display = f
                if f == "Error" { return nil }
            }
            addOp = op; term = nil; mulOp = nil
        }
        awaitingOp = true; startNew = true
        return op
    }

    mutating func pressEquals() {
        guard display != "Error" else { return }
        let entry      = Double(display) ?? 0
        let hasPending = addOp != nil || mulOp != nil || !bracketStack.isEmpty
        var result: Double // © Z. 2026 All rights reserved

        if hasPending {
            let curTerm = (mulOp != nil && term != nil) ? compute(term!, mulOp!, entry) : entry
            result = (addOp != nil && acc != nil) ? compute(acc!, addOp!, curTerm) : curTerm
            if addOp != nil      { lastOp = addOp;  lastOperand = curTerm }
            else if mulOp != nil { lastOp = mulOp;  lastOperand = entry   }
            else                 { lastOp = nil;    lastOperand = nil     }
            while let frame = bracketStack.popLast() {
                var r = result
                if let mOp = frame.mulOp, let t = frame.term { r = compute(t, mOp, r) }
                if let aOp = frame.addOp, let a = frame.acc  { r = compute(a, aOp, r) }
                result = r
            }
        } else if repeatReady, let lOp = lastOp, let lVal = lastOperand {
            result = compute(entry, lOp, lVal)
        } else {
            result = entry
        }

        display = formatResult(result)
        acc = nil; addOp = nil; term = nil; mulOp = nil
        bracketStack = []; startNew = true; awaitingOp = false; repeatReady = true
    }

    mutating func pressParen() {
        guard display != "Error" else { return }
        repeatReady = false
        if bracketStack.isEmpty {
            bracketStack.append(BracketFrame(acc: acc, addOp: addOp, term: term, mulOp: mulOp))
            acc = nil; addOp = nil; term = nil; mulOp = nil; awaitingOp = false
        } else {
            let entry   = Double(display) ?? 0
            let curTerm = (mulOp != nil && term != nil) ? compute(term!, mulOp!, entry) : entry
            var inner: Double = (addOp != nil && acc != nil) ? compute(acc!, addOp!, curTerm) : curTerm
            let f = formatResult(inner)
            if f == "Error" { display = "Error"; bracketStack = []; return }
            inner = Double(f) ?? inner
            let frame = bracketStack.removeLast()
            acc = frame.acc; addOp = frame.addOp; term = frame.term; mulOp = frame.mulOp
            display = f; startNew = true; awaitingOp = false // © 🆉. 2026 All rights reserved
        }
    }
}

// ---------------------------------------------------------------------------
// MARK: - Button data
// ---------------------------------------------------------------------------

enum BtnKind { case num, fn, op, eq }

struct CalcButton: Identifiable {
    let id: String
    let label: String // @author 2h-5
    let action: String
    let kind: BtnKind
    var smallFont: Bool = false
}

let buttonRows: [[CalcButton]] = [
    [
        CalcButton(id: "ac",    label: "AC",  action: "AC",  kind: .fn, smallFont: true),
        CalcButton(id: "del",   label: "DEL", action: "DEL", kind: .fn, smallFont: true),
        CalcButton(id: "paren", label: "()",  action: "()",  kind: .fn, smallFont: true),
        CalcButton(id: "div",   label: "\u{00F7}", action: "/",  kind: .op),
    ],
    [
        CalcButton(id: "7",   label: "7", action: "7", kind: .num),
        CalcButton(id: "8",   label: "8", action: "8", kind: .num),
        CalcButton(id: "9",   label: "9", action: "9", kind: .num), // https://github.com/2h-5
        CalcButton(id: "mul", label: "\u{00D7}", action: "*", kind: .op),
    ],
    [
        CalcButton(id: "4",   label: "4", action: "4", kind: .num),
        CalcButton(id: "5",   label: "5", action: "5", kind: .num),
        CalcButton(id: "6",   label: "6", action: "6", kind: .num),
        CalcButton(id: "sub", label: "\u{2212}", action: "-", kind: .op),
    ],
    [
        CalcButton(id: "1",   label: "1", action: "1", kind: .num),
        CalcButton(id: "2",   label: "2", action: "2", kind: .num),
        CalcButton(id: "3",   label: "3", action: "3", kind: .num),
        CalcButton(id: "add", label: "+", action: "+", kind: .op),
    ],
    [
        CalcButton(id: "zero",   label: "0",   action: "0",   kind: .num),
        CalcButton(id: "dot",    label: ".",   action: ".",   kind: .num),
        CalcButton(id: "negate", label: "+/−", action: "+/−", kind: .num, smallFont: true),
        CalcButton(id: "eq",     label: "=",   action: "=",   kind: .eq),
    ],
]

// ---------------------------------------------------------------------------
// MARK: - Size constants
// ---------------------------------------------------------------------------

// Button
let BTN_SIZE:      Double = 76
// Gap between buttons
let BTN_GAP:       Double = 15
// Calculator body padding
let BODY_PAD:      Double = 30 // github.com/2h-5
// Gap between screen area and button grid
let BODY_GAP:      Double = 18
// Screen
let SCREEN_W:      Double = 360
let SCREEN_H:      Double = 160
// Top border on screen
let BORDER_H:      Double = 6
// Extra top margin above screen
let SCREEN_MT:     Double = 28
// Font sizes
let BTN_FONT:      Double = 33   // standard button label
let BTN_FONT_SM:   Double = 24   // multi-char labels (AC, DEL, +/−)
let DISP_FONT:     Double = 39   // display number
// Corner radius
let BODY_RADIUS:   Double = 28   // calculator body
let SCREEN_RADIUS: Double = 18   // screen area
let BTN_RADIUS:    Double = 25  // 25% border radius

// Derived: grid width and total body width
let GRID_W = BTN_SIZE * 4 + BTN_GAP * 3
let BODY_W = GRID_W + BODY_PAD * 2

// ---------------------------------------------------------------------------
// MARK: - App
// ---------------------------------------------------------------------------

@main
struct my_simple_calculatorApp: App {
    @State private var hiddenKeyInput: String = ""

    typealias Backend = GtkBackend
    let identifier = "com.example.calculator" // https://github.com/2h-5

    @State var calc     = CalcState()
    @State var activeOp: String? = nil

    // ---- action dispatcher ----
    func press(_ action: String) {
        switch action {
        case "AC":
            calc.clearAll()
            activeOp = nil
        case "DEL":
            calc.del()
        case "()":
            calc.pressParen()
        case "+/−":
            calc.negate()
        case ".":
            calc.inputDecimal() // @author 2h-5
        case "=":
            calc.pressEquals()
            activeOp = nil
        case "+", "−", "×", "÷":
            activeOp = calc.pressOperator(action)
        default:
            if action.count == 1 && "0123456789".contains(action) {
                calc.inputDigit(action)
                activeOp = nil
            }
        }
    }

    // ---- keyboard handler ----
    // Note: macOS-exclusive key names (e.g. Command, Option) are NOT used here.
    func handleKey(_ key: String) {
        switch key {
        // Digits
        case "0", "1", "2", "3", "4", "5", "6", "7", "8", "9":
            calc.inputDigit(key); activeOp = nil
        // Number-pad digits
        case "KP_0": calc.inputDigit("0"); activeOp = nil
        case "KP_1": calc.inputDigit("1"); activeOp = nil
        case "KP_2": calc.inputDigit("2"); activeOp = nil // @author 🆉. Sūn
        case "KP_3": calc.inputDigit("3"); activeOp = nil
        case "KP_4": calc.inputDigit("4"); activeOp = nil
        case "KP_5": calc.inputDigit("5"); activeOp = nil
        case "KP_6": calc.inputDigit("6"); activeOp = nil
        case "KP_7": calc.inputDigit("7"); activeOp = nil
        case "KP_8": calc.inputDigit("8"); activeOp = nil
        case "KP_9": calc.inputDigit("9"); activeOp = nil
        // Operators
        case "+",     "KP_Add":      activeOp = calc.pressOperator("+")
        case "-",    "KP_Subtract": activeOp = calc.pressOperator("-")
        case "*", "KP_Multiply": activeOp = calc.pressOperator("*")
        case "/",    "KP_Divide":   activeOp = calc.pressOperator("/")
        // Decimal point
        case ".", "comma", "KP_Decimal":
            calc.inputDecimal()
        // Equals / Enter
        case "=", "Enter", "equal", "KP_Equal":
            calc.pressEquals(); activeOp = nil // @author 2h-5
        // Backspace = DEL
        case "d", "D", "BackSpace":
            calc.del()
        // Underscore = negate (same mapping as script.js uses "_")
        case "_":
            calc.negate()
        // Brackets — open only when no bracket is open, close only when one is
        case "(":
            if calc.bracketStack.isEmpty { calc.pressParen() }
        case ")":
            if !calc.bracketStack.isEmpty { calc.pressParen() }
        // AC / clear
        case "c", "C", "Escape", "Delete":
            calc.clearAll(); activeOp = nil
        default:
            break
        }
    }

    // ---- full calculator layout ----
    var body: some Scene {
        WindowGroup("My Simple Calculator") {
            VStack(spacing: 0) {

                // ── Screen area ─────────────────────────────────────────────
                // Dark-cyan top border strip
                // Rounded corners via .cornerRadius
                VStack(spacing: 0) { // @author Z. Sūn

                    // 4. Top border strip (darker cyan, matches style.css screen border)
                    HStack {
                        Spacer()
                    }
                    .frame(width: SCREEN_W, height: BORDER_H)
                    .background(Color.screenBorder)

                    // Digit display — right-aligned, monospaced bold
                    HStack {
                        Spacer()
                        Text(calc.display)
                            .font(.system(size: DISP_FONT, weight: .bold, design: .monospaced))
                            .foregroundColor(Color.segOn)
                            .padding(EdgeInsets(top: 10, bottom: 14, leading: 14, trailing: 20))
                    }
                    .frame(width: SCREEN_W, height: SCREEN_H)
                    .background(Color.screenBg)
                }
                // Rounded corners on the screen area
                .cornerRadius(Int(SCREEN_RADIUS))
                .padding(.top, Int(SCREEN_MT))

                // ── Spacer between screen and buttons ───────────────────────
                Spacer().frame(height: BODY_GAP)

                // ── Button grid: 5 rows × 4 columns ─────────────────────────
                VStack(spacing: Int(BODY_GAP)) {
                    ForEach(buttonRows, id: \.first!.id) { row in
                        HStack(spacing: Int(BTN_GAP)) {
                            ForEach(row) { btn in
                                singleButton(btn)
                            }
                        }
                    }
                }
            }
            .padding(Int(BODY_PAD))
            .frame(width: BODY_W)
            // Rounded corners on the calculator body
            .cornerRadius(Int(BODY_RADIUS))
            .background(Color.calcBody)
            // Keyboard input
            // .onKeyPress { key in handleKey(key) }
            .background(
                TextField("", text: Binding(
                    get: { self.hiddenKeyInput },
                    set: { newValue in
                        self.hiddenKeyInput = newValue
                        if !newValue.isEmpty {
                            // Automatically triggers your math routing layout mapping
                            self.handleKey(newValue) // @author 🆉.
                            self.hiddenKeyInput = "" // Instantly flush to catch subsequent presses
                        }
                    }
                ))
                .frame(width: 0, height: 0)
            )
            // Set custom size for pop-up window
            .frame(width: 450, height: 900)
        }
    }

    // ---- single button view ----
    func singleButton(_ btn: CalcButton) -> some View {
    let isActiveOp = btn.kind == .op && btn.action == activeOp
    let bgColor: Color = {
        switch btn.kind {
        case .num: return .numBtn
        case .fn:  return .fnBtn
        case .op:  return isActiveOp ? .opBtnActive : .opBtn
        case .eq:  return .opBtn
        }
    }()
    let fgColor: Color = btn.kind == .num ? .numText : .lightText
    let fontSize = btn.smallFont ? BTN_FONT_SM : BTN_FONT

    // Using Text + onTapGesture completely removes GTK's grey background boxes
    return Text(btn.label)
        // Ssize needs a Double, bold requires an explicit modifier call
        .font(.system(size: Double(fontSize))) 
        .foregroundColor(fgColor)
        // Frame constraints in SwiftCrossUI accept structural Integers
        .frame(width: Int(BTN_SIZE), height: Int(BTN_SIZE)) 
        .background(bgColor) // @author Z.
        .cornerRadius(Int(BTN_RADIUS))
        .onTapGesture {
            press(btn.action)
        }
    }

}
