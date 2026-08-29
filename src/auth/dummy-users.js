/* ---------------------------------------------------------------------------
   DEMO CREDENTIALS — type these on the login screen:

     officer / officer     Compliance officer   → /review
     dev     / dev         Internal developer   → /developer
     manager / manager     Compliance manager   → /management

   Prototype only. Plain-text comparison, no backend, no hashing, no token.
   Replace authenticate() with a real call when there is something to call.
--------------------------------------------------------------------------- */

import { ROLES } from "./roles.js";

const DUMMY_USERS = [
  {
    username: "officer",
    password: "officer",
    name: "Amara Sim",
    initials: "AS",
    role: ROLES.OFFICER,
  },
  {
    username: "dev",
    password: "dev",
    name: "Edric Tan",
    initials: "ET",
    role: ROLES.DEVELOPER,
  },
  {
    username: "manager",
    password: "manager",
    name: "Rohan Mehta",
    initials: "RM",
    role: ROLES.MANAGER,
  },
];

/** Strip the password before anything reaches component state or storage. */
const toSession = ({ password, ...user }) => user;

/**
 * Plain string comparison against the hardcoded list.
 * Returns the session user, or null when the credentials do not match.
 */
export function authenticate(username, password) {
  const match = DUMMY_USERS.find(
    (u) => u.username === username.trim().toLowerCase() && u.password === password
  );
  return match ? toSession(match) : null;
}

/** Credentials rendered on the login screen so nobody has to remember them. */
export function listDemoAccounts() {
  return DUMMY_USERS.map(({ username, password, role, name }) => ({
    username,
    password,
    role,
    name,
  }));
}
