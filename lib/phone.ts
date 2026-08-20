const faDigits = '۰۱۲۳۴۵۶۷۸۹'
const arDigits = '٠١٢٣٤٥٦٧٨٩'

function toLatinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (char) => String(faDigits.indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String(arDigits.indexOf(char)))
}

export function normalizeIranPhone(value: unknown) {
  let digits = toLatinDigits(String(value ?? '')).replace(/\D/g, '')

  if (digits.startsWith('0098')) digits = `0${digits.slice(4)}`
  else if (digits.startsWith('98') && digits.length === 12) digits = `0${digits.slice(2)}`
  else if (digits.startsWith('9') && digits.length === 10) digits = `0${digits}`

  return digits
}

export function isValidIranMobile(value: unknown) {
  return /^09\d{9}$/.test(normalizeIranPhone(value))
}
