import { execFileSync } from 'node:child_process';
import { readFileSync, lstatSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXCEPTION_PATH = 'docs/qa/public-email-exceptions.json';
const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}\b/gi;
const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.mp3', '.mp4']);
const reservedDomain = (domain) => /^(?:[^.]+\.)*example\.(?:com|net|org)$/i.test(domain)
  || /\.(?:invalid|test|example)$/i.test(domain);

// Decode common literal encodings without evaluating source, loading URLs, or
// changing line numbers. This is an email guard, not a general PII/secret scanner.
export function normalizeEmailText(text) {
  for (let pass = 0; pass < 2; pass++) {
    text = text.replace(/&amp;/gi, '&')
      .replace(/&#(?:0*64|x0*40);|&commat;|%40|\\u0040|\\x40/gi, '@')
      .replace(/&#(?:0*46|x0*2e);|&period;|%2e|\\u002e|\\x2e/gi, '.');
  }
  return text;
}

function emails(text) {
  return normalizeEmailText(text).match(emailPattern) ?? [];
}

export function validateExceptions(policy) {
  if (policy?.schemaVersion !== 1 || !Array.isArray(policy.entries)) throw Error('Invalid public-email exception policy.');
  const seen = new Set();
  for (const entry of policy.entries) {
    if (typeof entry?.path !== 'string' || entry.path.startsWith('/') || entry.path.includes('\\')
      || entry.path.split('/').some(part => !part || part === '.' || part === '..') || /[*?\[\]]/.test(entry.path)
      || typeof entry.email !== 'string' || emails(entry.email).length !== 1 || emails(entry.email)[0] !== entry.email
      || typeof entry.reason !== 'string' || entry.reason.trim().length < 20) throw Error('Invalid public-email exception entry.');
    const key = `${entry.path}\n${entry.email.toLowerCase()}`;
    if (seen.has(key)) throw Error('Duplicate public-email exception entry.');
    seen.add(key);
  }
  return policy.entries;
}

export function unapprovedEmailLines(path, text, exceptions = []) {
  const findings = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const blocked = emails(line).some(email => {
      if (reservedDomain(email.split('@')[1])) return false;
      return !exceptions.some(entry => entry.email.toLowerCase() === email.toLowerCase()
        && (entry.path === path || path === EXCEPTION_PATH));
    });
    if (blocked) findings.push({ path, line: index + 1, kind: 'unapproved email' });
  }
  return findings;
}

export function scanTrackedText(root = process.cwd()) {
  let policy;
  try { policy = JSON.parse(readFileSync(resolve(root, EXCEPTION_PATH), 'utf8')); }
  catch { throw Error('Cannot read public-email exception policy.'); }
  const exceptions = validateExceptions(policy);
  const paths = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const findings = [];
  let textFiles = 0, binaryFiles = 0;
  for (const path of paths) {
    // Filenames are public even when the content is an image or another asset.
    if (unapprovedEmailLines(path, path, exceptions).length) findings.push({ path, line: 0, kind: 'unapproved email in path' });
    const absolute = resolve(root, path);
    const info = lstatSync(absolute);
    if (!info.isFile() || info.isSymbolicLink()) {
      findings.push({ path, line: 0, kind: 'unsupported tracked file type' });
      continue;
    }
    const knownBinary = binaryExtensions.has(extname(path).toLowerCase());
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(absolute)); }
    catch {
      if (knownBinary) binaryFiles++;
      else findings.push({ path, line: 0, kind: 'unsupported text encoding' });
      continue;
    }
    if (text.includes('\0')) {
      if (knownBinary) binaryFiles++;
      else findings.push({ path, line: 0, kind: 'non-text bytes require review' });
      continue;
    }
    textFiles++;
    findings.push(...unapprovedEmailLines(path, text, exceptions));
  }
  return { textFiles, binaryFiles, exceptions: exceptions.length, findings };
}

export function formatFindings(findings) {
  return findings.map(({ path, line, kind }) => `${JSON.stringify(normalizeEmailText(path).replace(emailPattern, '[EMAIL REDACTED]'))}:${line}: ${kind}`).join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = scanTrackedText();
    console.log(`Public email scan: ${result.textFiles} tracked UTF-8 files; ${result.binaryFiles} binary assets outside text coverage; ${result.exceptions} exact reviewed exceptions.`);
    if (result.findings.length) {
      console.error(formatFindings(result.findings));
      process.exitCode = 1;
    } else console.log('No unapproved email literals found. Binary images, history, remote artifacts and other identifiers require separate review.');
  } catch {
    // Never print source fragments, identifiers, or parser error excerpts to CI.
    console.error('Public email scan could not complete. Check tracked file access, UTF-8 encoding, and the exception policy.');
    process.exitCode = 1;
  }
}
