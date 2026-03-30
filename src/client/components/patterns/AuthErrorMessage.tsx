/**
 * Error message display for auth forms
 */
export function AuthErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}
