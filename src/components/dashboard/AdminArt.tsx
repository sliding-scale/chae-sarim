// Draws the envelope and paper plane on the invite card.
export function InviteArt() {
  return (
    <svg className="admin-hero-art is-invite" viewBox="0 0 200 165" aria-hidden="true">
      <defs>
        <linearGradient id="invite-env" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#7bc9a4" />
          <stop offset="1" stopColor="#2f9464" />
        </linearGradient>
        <linearGradient id="invite-plane" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#00a85a" />
          <stop offset="1" stopColor="#055c32" />
        </linearGradient>
      </defs>
      <path d="M136 34 C174 50 165 83 149 97 C128 111 143 140 177 133" fill="none" stroke="#14945c" strokeWidth="2" strokeDasharray="5 5" />
      <path d="M136 34 l14 -8 -4 18" fill="none" stroke="#128a52" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 97l48-45 60 40-10 48-97-8z" fill="url(#invite-env)" />
      <path d="M16 97l48 20 60-25-47 44z" fill="#3d9a70" />
      <path d="M38 64l64-14 20 55-77 12z" fill="#f7fffb" />
      <path d="M14 96l51 18 59-22-52 51z" fill="#6bb892" />
      <path d="M103 36l72-25-19 57-14-24-24 12z" fill="url(#invite-plane)" />
      <path d="M142 44l33-33-57 45z" fill="#0c7d48" />
      <path d="M142 44l8 29 6-23z" fill="#045236" />
    </svg>
  );
}

// Draws the map pin and blocks on the add-job-site card.
export function JobSiteArt() {
  return (
    <svg className="admin-hero-art is-site" viewBox="0 0 300 205" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="site-wave" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#e5f9ee" />
          <stop offset="1" stopColor="#7ddeb0" />
        </linearGradient>
        <linearGradient id="site-pin" x1="0" x2="1" y1="1" y2="0">
          <stop stopColor="#006c3d" />
          <stop offset="1" stopColor="#00ad66" />
        </linearGradient>
      </defs>
      <path className="site-wave-back" fill="url(#site-wave)" d="M300 0V205H0c74-26 96-97 170-128S240 9 300 0Z" />
      <path className="site-wave-front" fill="#b7efd0" d="M300 31v174H40c60-11 106-49 142-85S248 52 300 31Z" />
      <path className="site-block-top" d="m124 121 30-20 31 18-31 20z" fill="#9ee4c0" />
      <path className="site-block-side" d="m124 121 30 18v44l-30-17z" fill="#5fbf93" />
      <path className="site-block-face" d="m154 139 31-20v44l-31 20z" fill="#2f9d68" />
      <path className="site-block-top" d="m197 104 23-13 24 14-23 14z" fill="#c8f6dc" />
      <path className="site-block-side" d="m197 104 24 15v51l-24-15z" fill="#6dcaa0" />
      <path className="site-block-face" d="m221 119 23-14v50l-23 15z" fill="#3aaa72" />
      <path d="M170 191c30-47 100-22 89-82" stroke="#00a56e" strokeDasharray="5 8" strokeWidth="2" fill="none" />
      <path fill="url(#site-pin)" d="M241 34a23 23 0 0 0-23 23c0 17 23 43 23 43s23-26 23-43a23 23 0 0 0-23-23Z" />
      <circle cx="241" cy="57" r="9" fill="#d1f9e2" />
    </svg>
  );
}
