export const passwordOperation = (hasCredential: boolean, currentPassword: string, newPassword: string) => {
  if (newPassword.length < 12) return { error: "New password must contain at least 12 characters." } as const;
  if (hasCredential && !currentPassword) return { error: "Enter your current password." } as const;
  return { kind: hasCredential ? "change" : "set" } as const;
};
