import { Ellipsis, SquarePen, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "../../../../client/components/ui/dropdown-menu";
import {
  UsersDropdownContent,
  UsersDropdownMenuItem,
  UsersMenuTriggerButton,
} from "../../../../client/components/patterns/UsersDashboardPatterns";

const DropdownEditDelete = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UsersMenuTriggerButton>
          <Ellipsis size={16} />
        </UsersMenuTriggerButton>
      </DropdownMenuTrigger>
      <UsersDropdownContent>
        <UsersDropdownMenuItem>
          <SquarePen size={16} />
          Edit
        </UsersDropdownMenuItem>
        <UsersDropdownMenuItem>
          <Trash2 size={16} />
          Delete
        </UsersDropdownMenuItem>
      </UsersDropdownContent>
    </DropdownMenu>
  );
};

export default DropdownEditDelete;
