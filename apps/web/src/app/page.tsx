import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { resolveSessionHomePath } from "../lib/auth-routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(resolveSessionHomePath(user));
}
