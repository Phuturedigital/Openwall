export function Footer() {
  return (
    <footer className="text-center text-[11px] text-gray-500 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <p>
        © 2025 <span className="font-medium text-gray-700 dark:text-gray-300">Openwall</span> — by{' '}
        <a
          href="https://www.phuturedigital.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
        >
          Phuture Digital
        </a>
        .
      </p>
      <p className="mt-1 text-gray-400 dark:text-gray-500">
        Powered by{' '}
        <span className="font-medium text-gray-600 dark:text-gray-400">Phuture Digital</span>
      </p>
    </footer>
  );
}
