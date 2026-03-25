import { type ReactNode } from "react";
import { Link } from "react-router";

const menuItemBaseClassName =
  "text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors";

export const MenuListItemLink = ({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick?: () => void;
  children: ReactNode;
}) => {
  return (
    <li>
      <Link to={to} onClick={onClick} className={menuItemBaseClassName}>
        {children}
      </Link>
    </li>
  );
};

export const MenuListItemButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) => {
  return (
    <li>
      <button type="button" onClick={onClick} className={menuItemBaseClassName}>
        {children}
      </button>
    </li>
  );
};