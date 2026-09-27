import { maintenanceUnavailable } from "@/lib/security/internal-worker";

export async function GET() {
  return maintenanceUnavailable();
}
