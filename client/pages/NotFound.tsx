import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="inline-grid place-items-center h-12 w-12 rounded-lg bg-neutral-900 border border-neutral-800 mb-4">
          <span className="text-neutral-300 font-semibold">404</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-neutral-400">
          The page you are looking for doesn’t exist or was moved.
        </p>
        <div className="mt-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-100 text-neutral-900 px-3.5 py-2.5 text-sm font-semibold hover:brightness-95 active:brightness-90 transition-colors"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
