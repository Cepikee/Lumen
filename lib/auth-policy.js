"use strict";

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { valid: false, message: "A jelszónak 8–128 karakter hosszúnak kell lennie." };
  }
  // bcrypt csak az első 72 UTF-8 bájtot használja. A karakterhossz önmagában
  // ezért nem elég: két különböző hosszú Unicode/ASCII jelszó ugyanarra a
  // bcrypt inputra csonkolódhatna. Új jelszót 72 bájt fölött nem fogadunk el.
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { valid: false, message: "A jelszó UTF-8 kódolásban legfeljebb 72 bájt lehet." };
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
