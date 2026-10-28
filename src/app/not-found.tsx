import Link from "next/link";

export default function NotFound() {
  return (
    <div className="error-state">
      <h1>That doesn't look like a Bitcoin address, transaction or block.</h1>
      <p>Check what you pasted, or search again from the home page.</p>
      <Link className="btn btn-primary" href="/">
        Back to search
      </Link>
    </div>
  );
}
