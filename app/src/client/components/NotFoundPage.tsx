import { useAuth } from "wasp/client/auth";
import {
  NotFoundHeading,
  NotFoundHomeLink,
  NotFoundMessage,
  NotFoundPageCard,
  NotFoundPageContainer,
} from "./patterns/NotFoundPatterns";

export function NotFoundPage() {
  const { data: user } = useAuth();

  return (
    <NotFoundPageContainer>
      <NotFoundPageCard>
        <NotFoundHeading>404</NotFoundHeading>
        <NotFoundMessage>
          Oops! The page you&apos;re looking for doesn&apos;t exist.
        </NotFoundMessage>
        <NotFoundHomeLink>Go Back Home</NotFoundHomeLink>
      </NotFoundPageCard>
    </NotFoundPageContainer>
  );
}
