import type { ReactNode } from "react";

export const StudentDashboardRoot = ({
  children,
  testId,
}: {
  children: ReactNode;
  testId: string;
}) => {
  return (
    <div className="p-6 space-y-6" data-testid={testId}>
      {children}
    </div>
  );
};

export const StudentDashboardTitle = ({ children }: { children: ReactNode }) => {
  return <h1 className="text-2xl font-semibold">{children}</h1>;
};

export const StudentDashboardMutedText = ({
  children,
  testId,
}: {
  children: ReactNode;
  testId?: string;
}) => {
  return (
    <p className="text-sm text-muted-foreground" data-testid={testId}>
      {children}
    </p>
  );
};

export const StudentDashboardInterestList = ({
  children,
  testId,
}: {
  children: ReactNode;
  testId: string;
}) => {
  return (
    <ul className="space-y-3" data-testid={testId}>
      {children}
    </ul>
  );
};

export const StudentDashboardInterestItem = ({
  children,
  testId,
}: {
  children: ReactNode;
  testId: string;
}) => {
  return (
    <li
      className="rounded-md border border-border bg-card px-4 py-3 space-y-1"
      data-testid={testId}
    >
      {children}
    </li>
  );
};

export const StudentDashboardInterestTitle = ({ children }: { children: ReactNode }) => {
  return <p className="font-medium">{children}</p>;
};

export const StudentDashboardInterestSchool = ({ children }: { children: ReactNode }) => {
  return <p className="text-sm text-muted-foreground">{children}</p>;
};

export const StudentDashboardInterestStatusLine = ({
  children,
}: {
  children: ReactNode;
}) => {
  return <p className="text-sm">{children}</p>;
};

export const StudentDashboardInterestStatusLabel = ({
  children,
}: {
  children: ReactNode;
}) => {
  return <span className="font-medium">{children}</span>;
};

export const StudentDashboardInterestStatusValue = ({
  children,
  testId,
}: {
  children: ReactNode;
  testId: string;
}) => {
  return <span data-testid={testId}>{children}</span>;
};
