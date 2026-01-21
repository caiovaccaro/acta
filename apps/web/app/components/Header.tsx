import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-center border-b border-border-light bg-background-light/95 backdrop-blur-sm">
      <div className="flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-10">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="size-6 text-text-main">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path
                  clipRule="evenodd"
                  d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z"
                  fill="currentColor"
                  fillRule="evenodd"
                ></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-main">Acta</h2>
          </Link>
        </div>
      </div>
    </header>
  );
}






