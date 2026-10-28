import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-6 py-16 text-center">
      <h2 className="text-xl font-extrabold text-ink">That page wandered off.</h2>
      <p className="mt-2 text-sm text-muted">
        The inbox is still right where you left it.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-full bg-mcw px-4 py-2 text-sm font-semibold text-white"
      >
        Back to Inbox
      </Link>
    </div>
  );
}
