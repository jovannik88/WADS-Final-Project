// Redirect /dashboard/tasks/[id] back to the tasks list
// Individual task editing is handled via modals on the tasks page
import { redirect } from "next/navigation";

export default function TaskDetailPage() {
  redirect("/dashboard/tasks");
}
