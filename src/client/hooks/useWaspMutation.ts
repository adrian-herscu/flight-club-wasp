import { useState } from "react";
import { toast } from "./use-toast";

type ToastPayload = {
  title: string;
  description?: string;
};

type UseWaspMutationOptions<TResult> = {
  successToast?: ToastPayload;
  /** When omitted, errors are handled entirely by the `onError` callback. */
  errorToast?: ToastPayload & { fallbackDescription?: string };
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (err: unknown) => void | Promise<void>;
};

type UseWaspMutationReturn<TArgs> = {
  mutate: (args: TArgs) => Promise<void>;
  isPending: boolean;
};

/**
 * Wraps a Wasp action with automatic loading state, success toast, and
 * error toast. Eliminates the try/catch/toast/finally boilerplate that
 * appears in every mutation handler across the codebase.
 *
 * Wasp auto-invalidates related queries by entity — no manual refetch()
 * calls are needed after calling mutate().
 */
export function useWaspMutation<TArgs, TResult = any>(
  actionFn: (args: TArgs) => Promise<TResult>,
  options: UseWaspMutationOptions<TResult>,
): UseWaspMutationReturn<TArgs> {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (args: TArgs): Promise<void> => {
    setIsPending(true);
    try {
      const result = await actionFn(args);
      if (options.successToast) {
        toast({
          title: options.successToast.title,
          description: options.successToast.description,
        });
      }
      await options.onSuccess?.(result);
    } catch (err: unknown) {
      if (options.errorToast) {
        const description =
          err instanceof Error
            ? err.message
            : options.errorToast.fallbackDescription;
        toast({
          title: options.errorToast.title,
          description,
          variant: "destructive",
        });
      }
      await options.onError?.(err);
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}
