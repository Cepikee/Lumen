"use strict";

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { valid: false, message: "A jelszónak 8–128 karakter hosszúnak kell lennie." };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { valid: false, message: "A jelszónak betűt és számot is tartalmaznia kell." };
  }
  return { valid: true, message: null };
}

function validatePin(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

module.exports = { validatePassword, validatePin };
