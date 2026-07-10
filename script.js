document.addEventListener("DOMContentLoaded", () => {
  const display = document.querySelector(".result")
  const buttons = document.querySelectorAll("button")

  let currentInput = "0"
  let pendingOperation = null
  let pendingValue = null
  let resetInput = false

  // For bracket functionality
  let bracketActive = false
  let bracketPendingOperation = null
  let bracketPendingValue = null

  // Update display with current input
  function updateDisplay() {
    display.textContent = currentInput
  }

  // Handle number button clicks
  function handleNumber(number) {
    if (resetInput) {
      currentInput = number
      resetInput = false
    } else {
      // Only add digit if we haven't reached 9 digits yet
      if (currentInput === "0") {
        currentInput = number
      } else if (currentInput.replace(/[.-]/g, "").length < 9) {
        currentInput += number
      }
    }

    updateDisplay()
  }

  // Handle operator button clicks
  function handleOperator(op) {
    const inputValue = Number.parseFloat(currentInput)

    if (pendingOperation === null) {
      // First number entered, store it and the operation
      pendingValue = inputValue
      pendingOperation = op
      resetInput = true
    } else {
      // We already have a pending operation, calculate it
      const result = calculate(pendingValue, inputValue, pendingOperation)

      // Update the display and pending values
      currentInput = formatResult(result)
      pendingValue = Number.parseFloat(currentInput)
      pendingOperation = op
      resetInput = true
    }

    updateDisplay()
  }

  // Handle equals button click
  function handleEquals() {
    if (pendingOperation === null) return

    const inputValue = Number.parseFloat(currentInput)

    // If we're in a bracket, close it and use the result
    if (bracketActive) {
      const bracketResult = calculate(bracketPendingValue, inputValue, bracketPendingOperation)
      currentInput = formatResult(bracketResult)

      // Now calculate the outer expression
      const finalResult = calculate(pendingValue, Number.parseFloat(currentInput), pendingOperation)
      currentInput = formatResult(finalResult)

      // Reset bracket state
      bracketActive = false
      bracketPendingOperation = null
      bracketPendingValue = null

      // Reset main state
      pendingOperation = null
      pendingValue = null
    } else {
      // Normal calculation
      const result = calculate(pendingValue, inputValue, pendingOperation)
      currentInput = formatResult(result)
      pendingOperation = null
      pendingValue = null
    }

    resetInput = true
    updateDisplay()
  }

  // Handle bracket button click
  function handleBracket() {
    // Can only start a bracket after an operator
    if (!bracketActive && pendingOperation !== null) {
      // Start a new bracket calculation
      bracketActive = true
      bracketPendingOperation = null
      bracketPendingValue = null
      currentInput = "0"
      resetInput = true
    }
    // Closing a bracket
    else if (bracketActive) {
      const bracketResult = Number.parseFloat(currentInput)

      // If there's a pending operation inside the bracket, calculate it first
      if (bracketPendingOperation !== null) {
        const result = calculate(bracketPendingValue, bracketResult, bracketPendingOperation)
        currentInput = formatResult(result)
      }

      // Exit bracket mode
      bracketActive = false
      resetInput = true
    }

    updateDisplay()
  }

  // Calculate the result based on the operation with operator precedence
  function calculate(a, b, operation) {
    let result

    switch (operation) {
      case "+":
        result = a + b
        break
      case "-":
        result = a - b
        break
      case "*":
        result = a * b
        break
      case "/":
        // Handle division by zero
        result = b === 0 ? 0 : a / b
        break
      default:
        return b
    }

    return result
  }

  // Format the result to fit in the display
  function formatResult(number) {
    let result = number.toString()

    // If the number is too long, we need to format it
    if (result.replace(/[.-]/g, "").length > 9) {
      // For integers or numbers with few decimal places
      if (Number.isInteger(number) || result.split(".")[1].length <= 9 - result.split(".")[0].length) {
        result = number.toFixed(9 - result.split(".")[0].length - 1)
      } else {
        // For numbers with many decimal places
        const integerPart = Math.floor(Math.abs(number)) * (number < 0 ? -1 : 1)
        const integerDigits = integerPart.toString().replace("-", "").length
        const availableDecimalDigits = 9 - integerDigits - (number < 0 ? 1 : 0)

        if (availableDecimalDigits > 0) {
          result = number.toFixed(availableDecimalDigits)
        } else {
          result = integerPart.toString()
        }
      }
    }

    return result
  }

  // Add event listeners to all buttons
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-value")

      if (button.classList.contains("number")) {
        handleNumber(value)
      } else if (button.classList.contains("operator")) {
        if (bracketActive) {
          // If we're in a bracket and have a value but no operation yet
          if (bracketPendingOperation === null) {
            bracketPendingValue = Number.parseFloat(currentInput)
            bracketPendingOperation = value
            resetInput = true
          }
          // If we already have a pending operation in the bracket
          else {
            const inputValue = Number.parseFloat(currentInput)
            const result = calculate(bracketPendingValue, inputValue, bracketPendingOperation)
            currentInput = formatResult(result)
            bracketPendingValue = Number.parseFloat(currentInput)
            bracketPendingOperation = value
            resetInput = true
          }
        } else {
          handleOperator(value)
        }
      } else if (button.classList.contains("equals")) {
        handleEquals()
      } else if (button.classList.contains("bracket")) {
        handleBracket()
      }

      updateDisplay()
    })
  })

  // Initialize display
  updateDisplay()
})

