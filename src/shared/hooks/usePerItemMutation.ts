import { useRef, useState } from "react";
import { useWaspMutation } from "./useWaspMutation";

type ToastPayload = {
  title: string;
  description?: string;
};

type UsePerItemMutationOptions = {
  successToast?: ToastPayload;
  errorToast?: ToastPayload & { fallbackDescription?: string };
  /**
   * Called with the active ID after a successful mutation.
   * Uses a ref internally so the callback always receives the correct ID
   * regardless of React render timing.
   */
  onSuccess?: (id: string) => void | Promise<void>;
  onError?: (err: unknown) => void | Promise<void>;
};

/**
 * Manages the per-item loading-ID pattern used across list-action pages
 * (approve/reject per row, cancel per interest, etc.).
 *
 * Replaces the recurring trio of:
 *   1. `useState<string | null>(null)` for the active item ID
 *   2. `useWaspMutation(fn, { onSuccess: () => setId(null), onError: () => setId(null) })`
 *   3. `const handleXxx = async (id) => { setId(id); await mutation.mutate(args) }`
 *
 * Usage:
 *   const [handleApprove, isApprovingId] = usePerItemMutation(
 *     (id) => approveRequest({ requestId: id, schoolId }),
 *     { successToast: { title: "Approved" }, errorToast: { title: "Failed" } },
 *   );
 *   // In JSX: disabled={isApprovingId === request.id}
 */
export function usePerItemMutation(
  actionFn: (id: string) => Promise<unknown>,
  options: UsePerItemMutationOptions = {},
): [(id: string) => Promise<void>, string | null] {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Ref ensures onSuccess/onError always see the correct ID regardless of
  // React render timing (avoids stale closure on the state value).
  const activeIdRef = useRef<string | null>(null);

  const mutation = useWaspMutation(
    ({ id }: { id: string }) => actionFn(id),
    {
      successToast: options.successToast,
      errorToast: options.errorToast,
      onSuccess: async () => {
        const id = activeIdRef.current;
        activeIdRef.current = null;
        setActiveId(null);
        if (id) await options.onSuccess?.(id);
      },
      onError: async (err) => {
        activeIdRef.current = null;
        setActiveId(null);
        await options.onError?.(err);
      },
    },
  );

  const handle = async (id: string): Promise<void> => {
    if (mutation.isPending) return;
    activeIdRef.current = id;
    setActiveId(id);
    await mutation.mutate({ id });
  };

  return [handle, activeId];
}
