// Prototype-only hardcoded users: officer/officer, dev/dev, manager/manager. Plain-text comparison, no backend.
import { type AuthUser, ROLES } from "./roles.ts";

interface DummyUser extends AuthUser {
  password: string;
}

const DUMMY_USERS: DummyUser[] = [
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
const toSession = ({ password, ...user }: DummyUser): AuthUser => user;

/**
 * Plain string comparison against the hardcoded list.
 * Returns the session user, or null when the credentials do not match.
 */
export function authenticate(username: string, password: string): AuthUser | null {
  const match = DUMMY_USERS.find(
    (u) => u.username === username.trim().toLowerCase() && u.password === password,
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
