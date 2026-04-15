import { type ReactNode } from "react";
import { NavLink } from "react-router";

/**
 * Generic list row used across all portal pages.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │ title              [status] [action] │
 *   │ subtitle (muted, small)              │
 *   └─────────────────────────────────────┘
 *
 * When `href` is provided the entire card becomes a NavLink.
 */
export const ListItem = ({
  title,
  subtitle,
  subtitleTestId,
  status,
  statusTestId,
  action,
  href,
  testId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleTestId?: string;
  status?: ReactNode;
  statusTestId?: string;
  action?: ReactNode;
  href?: string;
  testId?: string;
}) => {
  const hasRightSlot = status != null || action != null;

  const inner = (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {hasRightSlot && (
          <div className="flex shrink-0 items-center gap-2">
            {status != null && (
              <span className="text-xs font-medium text-muted-foreground" data-testid={statusTestId}>
                {status}
              </span>
            )}
            {action}
          </div>
        )}
      </div>
      {subtitle != null && (
        <p className="mt-0.5 text-xs text-muted-foreground" data-testid={subtitleTestId}>
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <li data-testid={testId}>
      {href ? (
        <NavLink to={href} className="block transition-opacity hover:opacity-80">
          {inner}
        </NavLink>
      ) : (
        inner
      )}
    </li>
  );
};
