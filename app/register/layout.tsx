import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <>{children}</>;
}