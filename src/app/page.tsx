import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getSupabaseConfig } from "@/lib/auth";
import { Dashboard } from "./dashboard-client";
import { getDashboardData } from "@/lib/data";

export default async function Home() {
  await connection();

  const authProfile = await getAuthenticatedProfile();

  if (getSupabaseConfig() && !authProfile) {
    redirect("/login");
  }

  const data = await getDashboardData(authProfile);

  return <Dashboard auth={authProfile} data={data} />;
}
