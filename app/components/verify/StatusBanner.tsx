type StatusBannerProps = {
  message: string | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export function StatusBanner({ message, httpStatus, errorCode, errorMessage }: StatusBannerProps) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
      <p className="font-medium">{message}</p>
      {httpStatus !== null && httpStatus !== undefined ? (
        <p className="mt-1 text-xs text-red-800">HTTP {httpStatus}</p>
      ) : null}
      {errorCode ? (
        <p className="mt-1 font-mono text-xs text-red-800">
          Code: {errorCode}
          {errorMessage ? ` · ${errorMessage}` : ""}
        </p>
      ) : null}
    </div>
  );
}
