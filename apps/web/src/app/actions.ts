"use server";

import { redirect } from "next/navigation";
import { createLumiAuthActions } from "../lib/auth";
import { signInPath } from "../lib/auth-routes";

export async function signOutAction() {
  const auth = await createLumiAuthActions();
  await auth.signOut();
  redirect(signInPath);
}
