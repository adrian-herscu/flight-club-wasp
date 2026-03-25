import { ReactNode, useState } from "react";
import { NavItem } from "../../client/components/patterns/AdminSidebarPatterns";

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, open: boolean) => ReactNode;
  activeCondition: boolean;
}

const SidebarLinkGroup = ({
  children,
  activeCondition,
}: SidebarLinkGroupProps) => {
  const [open, setOpen] = useState(activeCondition);

  const handleClick = () => {
    setOpen(!open);
  };

  return <NavItem>{children(handleClick, open)}</NavItem>;
};

export default SidebarLinkGroup;
