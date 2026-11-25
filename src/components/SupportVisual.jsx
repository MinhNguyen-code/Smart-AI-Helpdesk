export default function SupportVisual() {
  return (
    <div className="login-hero-illustration" role="img" aria-label="Minh họa học đường BTEC FPT kết hợp công nghệ hỗ trợ CNTT với laptop, danh sách xử lý sự cố, sách, mũ tốt nghiệp và chậu cây">
      <svg className="login-hero-svg" viewBox="0 0 380 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="skyGlow" x1="190" y1="16" x2="190" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#E6F0FD" stopOpacity="0.88" />
            <stop offset="1" stopColor="#F5F8FD" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="screenBg" x1="110" y1="88" x2="275" y2="198" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F8FBFF" />
            <stop offset="1" stopColor="#EBF3FE" />
          </linearGradient>
          <linearGradient id="blueBadge" x1="150" y1="115" x2="190" y2="155" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3B82F6" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        {/* Soft ambient backdrop */}
        <ellipse cx="195" cy="142" rx="158" ry="108" fill="url(#skyGlow)" />
        <ellipse cx="192" cy="236" rx="160" ry="14" fill="#DCE7F7" fillOpacity="0.7" />

        {/* Campus building silhouette behind */}
        <g opacity="0.72">
          {/* Left wing */}
          <rect x="44" y="96" width="54" height="122" rx="4" fill="#DCE8F8" />
          <rect x="54" y="110" width="12" height="14" rx="2" fill="#F0F6FE" />
          <rect x="74" y="110" width="12" height="14" rx="2" fill="#F0F6FE" />
          <rect x="54" y="132" width="12" height="14" rx="2" fill="#F0F6FE" />
          <rect x="74" y="132" width="12" height="14" rx="2" fill="#F0F6FE" />
          <rect x="54" y="154" width="12" height="14" rx="2" fill="#F0F6FE" />
          <rect x="74" y="154" width="12" height="14" rx="2" fill="#F0F6FE" />

          {/* Main center academic hall with pediment & clock/crest */}
          <rect x="94" y="64" width="144" height="154" rx="5" fill="#D0E1F7" />
          <path d="M88 66L166 28L244 66H88Z" fill="#C2D7F4" />
          <circle cx="166" cy="50" r="9" fill="#F4F8FF" stroke="#9AB9E8" strokeWidth="2" />
          <path d="M166 45V50L170 52" stroke="#2563EB" strokeWidth="1.6" strokeLinecap="round" />

          {/* Campus columns / windows */}
          <rect x="110" y="78" width="16" height="22" rx="2.5" fill="#EAF2FD" />
          <rect x="136" y="78" width="16" height="22" rx="2.5" fill="#EAF2FD" />
          <rect x="180" y="78" width="16" height="22" rx="2.5" fill="#EAF2FD" />
          <rect x="206" y="78" width="16" height="22" rx="2.5" fill="#EAF2FD" />

          {/* Right wing */}
          <rect x="234" y="88" width="66" height="130" rx="4" fill="#DCE8F8" />
          <rect x="248" y="104" width="14" height="15" rx="2" fill="#F0F6FE" />
          <rect x="272" y="104" width="14" height="15" rx="2" fill="#F0F6FE" />
          <rect x="248" y="128" width="14" height="15" rx="2" fill="#F0F6FE" />
          <rect x="272" y="128" width="14" height="15" rx="2" fill="#F0F6FE" />
          <rect x="248" y="152" width="14" height="15" rx="2" fill="#F0F6FE" />
          <rect x="272" y="152" width="14" height="15" rx="2" fill="#F0F6FE" />
        </g>

        {/* Subtle network nodes & tech connection lines */}
        <path d="M68 62L108 76M282 54L244 72" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="66" cy="61" r="4.5" fill="#60A5FA" />
        <circle cx="285" cy="53" r="4" fill="#3B82F6" />
        <circle cx="318" cy="108" r="3.5" fill="#93C5FD" />

        {/* Desk surface line */}
        <rect x="24" y="226" width="332" height="6" rx="3" fill="#C7D8EE" />

        {/* Study books stack (left foreground) */}
        <g>
          {/* Bottom book */}
          <rect x="34" y="208" width="76" height="18" rx="4" fill="#2563EB" />
          <rect x="38" y="212" width="68" height="10" rx="2" fill="#EFF6FF" />
          <line x1="44" y1="217" x2="98" y2="217" stroke="#BFDBFE" strokeWidth="1.5" />
          {/* Top book */}
          <rect x="40" y="191" width="68" height="17" rx="4" fill="#1E3A8A" />
          <rect x="44" y="195" width="60" height="9" rx="2" fill="#F8FAFC" />
          <rect x="54" y="191" width="8" height="14" fill="#3B82F6" />

          {/* Graduation Cap resting on books */}
          <polygon points="74,167 110,179 74,191 38,179" fill="#0F2345" />
          <path d="M54 184V193C54 196 63 199 74 199C85 199 94 196 94 193V184" fill="#1E3A5F" />
          <path d="M102 181V197" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="102" cy="198" r="2.6" fill="#F59E0B" />
        </g>

        {/* Open Laptop (center-right main focal element) */}
        <g>
          {/* Laptop outer lid */}
          <rect x="104" y="84" width="184" height="124" rx="10" fill="#1E3A5F" stroke="#0F2345" strokeWidth="2" />
          {/* Laptop inner screen */}
          <rect x="112" y="92" width="168" height="106" rx="6" fill="url(#screenBg)" />

          {/* Top browser/window bar inside laptop */}
          <rect x="112" y="92" width="168" height="16" rx="6" fill="#DCE8F9" />
          <circle cx="122" cy="100" r="2.5" fill="#60A5FA" />
          <circle cx="130" cy="100" r="2.5" fill="#93C5FD" />
          <circle cx="138" cy="100" r="2.5" fill="#BFDBFE" />
          <rect x="152" y="97" width="64" height="6" rx="3" fill="#FFFFFF" />

          {/* IT Support Headset Badge on left side of laptop screen */}
          <rect x="124" y="118" width="54" height="66" rx="9" fill="#FFFFFF" stroke="#D5E3F7" strokeWidth="1.5" />
          <circle cx="151" cy="143" r="16" fill="url(#blueBadge)" />
          {/* Headset icon inside circle */}
          <path d="M143 144V141C143 136.582 146.582 133 151 133C155.418 133 159 136.582 159 141V144" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="141" y="142" width="4" height="7" rx="2" fill="#FFFFFF" />
          <rect x="157" y="142" width="4" height="7" rx="2" fill="#FFFFFF" />
          <path d="M158 148C158 150.5 155.5 152 152 152H149" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="135" y="167" width="32" height="5" rx="2.5" fill="#BFD6F6" />
          <rect x="141" y="175" width="20" height="4" rx="2" fill="#DCE8F8" />

          {/* SLA & Triage Checklist Card on right side of laptop screen */}
          <rect x="186" y="118" width="82" height="66" rx="9" fill="#FFFFFF" stroke="#D5E3F7" strokeWidth="1.5" />
          {/* Check row 1 */}
          <circle cx="198" cy="132" r="5.5" fill="#DCFCE7" />
          <path d="M195.5 132L197.3 133.8L200.8 130.2" stroke="#16A34A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="208" y="128" width="48" height="4.5" rx="2.25" fill="#2563EB" />
          <rect x="208" y="135" width="32" height="3.5" rx="1.75" fill="#CBD5E1" />

          {/* Check row 2 */}
          <circle cx="198" cy="151" r="5.5" fill="#DBEAFE" />
          <path d="M195.5 151L197.3 152.8L200.8 149.2" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="208" y="147" width="44" height="4.5" rx="2.25" fill="#3B82F6" />
          <rect x="208" y="154" width="28" height="3.5" rx="1.75" fill="#CBD5E1" />

          {/* Check row 3 */}
          <circle cx="198" cy="170" r="5.5" fill="#DBEAFE" />
          <path d="M195.5 170L197.3 171.8L200.8 168.2" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="208" y="166" width="50" height="4.5" rx="2.25" fill="#60A5FA" />
          <rect x="208" y="173" width="36" height="3.5" rx="1.75" fill="#CBD5E1" />

          {/* Laptop keyboard base */}
          <path d="M88 208H304L292 224H100L88 208Z" fill="#94A9C9" />
          <rect x="96" y="205" width="200" height="5" rx="2.5" fill="#CBD8EC" />
          <rect x="176" y="208" width="40" height="3" rx="1.5" fill="#64748B" />
        </g>

        {/* Small Potted Plant (right foreground) */}
        <g>
          {/* Leaves */}
          <path d="M326 196C316 184 314 170 322 162C330 170 330 183 326 196Z" fill="#3B82F6" />
          <path d="M329 197C331 181 341 169 351 167C349 179 340 191 329 197Z" fill="#2563EB" />
          <path d="M324 198C312 192 303 183 302 174C312 176 320 186 324 198Z" fill="#60A5FA" />
          {/* Plant pot */}
          <path d="M311 196H343L338 226H316L311 196Z" fill="#E2ECF9" stroke="#9AB4D8" strokeWidth="1.5" />
          <rect x="308" y="192" width="38" height="6" rx="3" fill="#BFD3EE" />
        </g>
      </svg>
    </div>
  );
}
