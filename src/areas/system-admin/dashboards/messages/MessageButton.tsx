import { MessageCircleMore } from "lucide-react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import {
  MessageButtonItem,
  MessageButtonLink,
  MessageNotificationBadge,
} from "../../../../client/components/patterns/AdminMessagePatterns";

const MessageButton = () => {
  return (
    <MessageButtonItem>
      <WaspRouterLink
        style={{
          height: "2.125rem",
          width: "2.125rem",
          borderColor: "hsl(var(--border))",
          backgroundColor: "hsl(var(--muted))",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          borderWidth: "0.5px",
        }}
        to={routes.SystemAdminMessagesRoute.to}
      >
        <MessageNotificationBadge />
        <MessageCircleMore style={{ width: "1.25rem", height: "1.25rem" }} />
      </WaspRouterLink>
    </MessageButtonItem>
  );
};

export default MessageButton;
