// Same canonical form as services/api (utils/registrationNo.js):
// no whitespace, upper-case. "2024 ps 01" -> "2024PS01".
export const normalizeRegistrationNo = (value) =>
  String(value ?? '').replace(/\s+/g, '').toUpperCase();
