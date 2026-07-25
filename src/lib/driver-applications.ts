import type { PendingDriver } from "./types";

export function driverApplicationIdentifier(driver: PendingDriver) {
  return driver.userId ?? driver.email;
}

export function matchesDriverApplication(driver: PendingDriver, identifier: string) {
  return driver.userId
    ? driver.userId === identifier
    : driver.email.toLowerCase() === identifier.toLowerCase();
}
