// Decorative, subject-neutral artwork. Labels and curriculum identity come from data.
const paths = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  courses: '<path d="M12 5C8 2 4 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-2-1-6-2-10 1Z"/><path d="M12 5v15"/>',
  work: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>',
  assessment: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 2 2 5-5M8 16h8"/>',
  progress: '<path d="M4 20h17M6 16v-4m6 4V8m6 8V3"/>',
  practice: '<path d="m4 16-1 5 5-1L21 7l-6-6Zm10-13 6 6M4 16l4 4"/>',
  review: '<path d="M4 11a8 8 0 1 1 2 6M4 4v7h7"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  logout: '<path d="M9 3H4v18h5M9 12h12m-5-5 5 5-5 5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
};
export function studentIcon(name) {
  return `<svg class="student-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.courses}</svg>`;
}
export function learningArtwork() {
  return '<svg class="student-learning-art" viewBox="0 0 240 180" fill="none" aria-hidden="true" focusable="false"><ellipse cx="126" cy="152" rx="97" ry="12" fill="#C1D8BC"/><path d="M37 133h146v15H37z" fill="#285B45"/><path d="m44 111 140-12 2 23-140 12z" fill="#F5F6EF" stroke="#285B45" stroke-width="2"/><path d="m40 91 135 14-2 17L38 108z" fill="#C1D8BC" stroke="#285B45" stroke-width="2"/><path d="M48 42c26-6 50 0 70 14v56C97 98 72 94 48 98Zm70 14c25-14 48-20 74-14v56c-27-4-50 0-74 14Z" fill="#fff" stroke="#285B45" stroke-width="3" stroke-linejoin="round"/><path d="m61 61 40 10m-40 4 40 10m33-14 42-10m-42 24 42-10" stroke="#C1D8BC" stroke-width="4" stroke-linecap="round"/><path d="M206 137V82m0 27c-18-4-23-17-21-27 16 2 24 12 21 27Zm0-12c18-4 23-17 21-27-16 2-24 12-21 27Z" fill="#C1D8BC" stroke="#285B45" stroke-width="2"/><path d="M195 128h24l-4 20h-16Z" fill="#285B45"/><circle cx="33" cy="43" r="7" fill="#C1D8BC"/><path d="M159 20v10m-5-5h10" stroke="#285B45" stroke-width="2" stroke-linecap="round"/></svg>';
}
