export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border-light">
      <div className="mx-auto max-w-6xl px-4 md:px-10 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-text-main">
            <div className="size-5">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path
                  clipRule="evenodd"
                  d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z"
                  fill="currentColor"
                  fillRule="evenodd"
                ></path>
              </svg>
            </div>
            <span className="text-sm font-semibold">Acta</span>
          </div>
          <p className="text-sm text-text-muted">© 2025 Acta. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a className="text-sm text-text-main hover:underline" href="#">
              Privacy Policy
            </a>
            <a className="text-sm text-text-main hover:underline" href="#">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}






