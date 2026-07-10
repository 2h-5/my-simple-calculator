document.addEventListener("DOMContentLoaded", () => {
    const display = document.querySelector(".result")
    const buttons = document.querySelectorAll("button")
  
    let currentInput = "0"
    let previousInput = "0"
    let operation = null
    let resetInput = false
    let equalsPressed = false
  
    // Update display with current input
    function updateDisplay() {
      display.textContent = currentInput
    }
  
    // Handle number button clicks
    function handleNumber(number) {
      // If equals was pressed and now a number is pressed, start fresh
      if (equalsPressed) {
        currentInput = "0"
        previousInput = "0"
        operation = null
        equalsPressed = false
        resetInput = true
      }
  
      // If we need to reset the input (after an operation or at start)
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
      // If we already have an operation pending, calculate it first
      if (operation && !resetInput && !equalsPressed) {
        calculate()
      }
  
      previousInput = currentInput
      operation = op
      resetInput = true
      equalsPressed = false
    }
  
    // Handle equals button click
    function handleEquals() {
      if (!operation) return
  
      calculate()
      equalsPressed = true
      operation = null
    }
  
    // Calculate the result based on the operation
    function calculate() {
      let result
      const prev = Number.parseFloat(previousInput)
      const current = Number.parseFloat(currentInput)
  
      switch (operation) {
        case "+":
          result = prev + current
          break
        case "-":
          result = prev - current
          break
        case "*":
          result = prev * current
          break
        case "/":
          // Handle division by zero
          result = current === 0 ? 0 : prev / current
          break
        default:
          return
      }
  
      // Convert to string and limit display to 9 digits
      currentInput = formatResult(result)
      updateDisplay()
      resetInput = true
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
          handleOperator(value)
        } else if (button.classList.contains("equals")) {
          handleEquals()
        }
      })
    })
  
    // Initialize display
    updateDisplay()
  })
  
  