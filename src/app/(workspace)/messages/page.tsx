import { getMessagesOverview } from "@/features/messages/services/get-messages-overview";
import { MessagesWorkspace } from "@/features/messages/components/messages-workspace";

export default async function MessagesPage() {
  const overview = await getMessagesOverview();

  return <MessagesWorkspace items={overview.items} />;
}
