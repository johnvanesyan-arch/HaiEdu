// haiedu-subject-art-v1: replaceable, decorative presentation keyed only by
// governed subjectCode. No access, subject defaults, grade or learning rules.
// Reserved codes can receive artwork before their curriculum is released.
const book = '<path d="M47 22c17-4 31-1 43 5 13-6 28-9 43-5v65c-15-4-30-2-43 5-12-7-26-9-43-5Z" fill="#fff"/><path d="M90 27v65"/>';
const art = Object.freeze({
 english: book+'<path d="M58 40h21m-21 12h21m-21 12h15m28-24h20m-20 12h20m-20 12h14M25 62v13m8-20v27m8-15v10"/>',
 physics: '<ellipse cx="88" cy="57" rx="51" ry="19"/><ellipse cx="88" cy="57" rx="51" ry="19" transform="rotate(60 88 57)"/><ellipse cx="88" cy="57" rx="51" ry="19" transform="rotate(120 88 57)"/><circle cx="88" cy="57" r="7" fill="currentColor"/><circle cx="39" cy="52" r="4" fill="#c89232" stroke="none"/><circle cx="112" cy="21" r="4" fill="currentColor"/>',
 mathematics: '<path d="m38 89 72-68v68Z" fill="#fff"/><path d="m62 78 36-34v34ZM45 83l5 5m6-15 5 5m6-15 5 5m6-15 5 5m6-15 5 5M122 22v16m-8-8h16M122 64h16m-16 9h16"/><circle cx="136" cy="49" r="2" fill="currentColor"/>',
 armenian: book+'<path d="M58 42v23c0 10 18 10 18 0V42m-18 13h18M103 43h19m-19 13h19m-19 13h13"/>',
 chemistry: '<path d="M72 20h36m-30 0v30L54 86q-5 9 6 9h62q11 0 6-9l-26-36V20" fill="#fff"/><path d="m68 65-14 21q-5 9 6 9h62q11 0 6-9l-15-21q-22 9-45 0Z" fill="#c1d8bc"/><circle cx="85" cy="78" r="3"/><circle cx="103" cy="86" r="2"/><circle cx="121" cy="36" r="4"/><circle cx="132" cy="23" r="3"/>',
 geography: '<circle cx="87" cy="49" r="34" fill="#fff"/><ellipse cx="87" cy="49" rx="15" ry="34"/><path d="M53 49h68M59 31h56M59 67h56m9-50a46 46 0 0 1-64 65m32 11v7m-19 0h38M50 14l10 10"/><path d="m78 22-5 13 12 6 6-9 8 4 4-12m-4 35-11-6-7 8 7 13" fill="#c1d8bc"/>',
 biology: '<path d="M88 94V48m0 25C53 75 43 49 48 30c29 0 44 21 40 43Zm0-17c1-28 21-40 45-36 0 22-17 42-45 36Z" fill="#fff"/><path d="m58 43 30 30m33-40L88 56M69 96h38M130 68c-18 6-18 20 0 26m10-26c18 6 18 20 0 26m-17-22h23m-28 9h33m-28 9h23"/>',
 history: '<path d="m42 39 48-23 48 23Zm7 52h82v10H49ZM54 45h14v39H54Zm29 0h14v39H83Zm29 0h14v39h-14Z" fill="#fff"/><path d="M39 40h102M55 52h12m17 0h12m17 0h12M40 101h100"/><circle cx="90" cy="30" r="3" fill="#c89232" stroke="none"/>',
 generic: book+'<path d="M58 42h21m-21 13h21m-21 13h15m28-26h20m-20 13h20m-20 13h14"/>',
});
const aliases = Object.freeze({math:'mathematics',armenian_language:'armenian'});
export function subjectArtwork(subjectCode) {
 const code = typeof subjectCode === 'string' ? subjectCode : '';
 const key = Object.hasOwn(art,code) ? code : Object.hasOwn(aliases,code) ? aliases[code] : 'generic';
 return `<svg class="student-subject-art" data-subject-art="${key}" viewBox="0 0 180 110" fill="none" aria-hidden="true" focusable="false"><circle cx="91" cy="57" r="43" fill="#c1d8bc" opacity=".65"/><circle cx="151" cy="25" r="8" fill="#e9bf68"/><g stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${art[key]}</g><path d="m25 24 2 6 6 2-6 2-2 6-2-6-6-2 6-2m128 49 2 5 5 2-5 2-2 5-2-5-5-2 5-2" fill="currentColor" opacity=".4"/></svg>`;
}
