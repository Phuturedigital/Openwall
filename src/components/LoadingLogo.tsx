type LoadingLogoProps = {
  className?: string;
};

export function LoadingLogo({ className = "w-12 h-12" }: LoadingLogoProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <rect
          x="10"
          y="10"
          width="80"
          height="80"
          rx="12"
          className="stroke-blue-500 dark:stroke-blue-400"
          strokeWidth="6"
          fill="none"
        />

        <rect
          x="25"
          y="25"
          width="22"
          height="22"
          rx="4"
          className="fill-blue-500 dark:fill-blue-400"
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0s'
          }}
        />

        <rect
          x="53"
          y="25"
          width="22"
          height="22"
          rx="4"
          className="fill-blue-500 dark:fill-blue-400"
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.2s'
          }}
        />

        <rect
          x="25"
          y="53"
          width="22"
          height="22"
          rx="4"
          className="fill-blue-500 dark:fill-blue-400"
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.4s'
          }}
        />

        <rect
          x="53"
          y="53"
          width="22"
          height="22"
          rx="4"
          className="fill-blue-500 dark:fill-blue-400"
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.6s'
          }}
        />
      </svg>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
