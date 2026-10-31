import { useMemo, type ReactNode } from 'react';

const KEYWORDS = new Set([
  'class', 'public', 'private', 'protected', 'virtual', 'override', 'return', 'void', 'int', 'double',
  'float', 'char', 'bool', 'new', 'delete', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'this', 'const', 'static', 'using', 'namespace', 'template', 'typename',
  'try', 'catch', 'throw', 'interface', 'abstract', 'final', 'struct', 'enum', 'auto', 'sizeof',
]);

const TYPES = new Set([
  'string', 'std', 'stringstream', 'size_t', 'List', 'Math', 'Console', 'Animal', 'Dog', 'Cat',
  'Vehicle', 'Car', 'Account', 'Shape', 'Circle', 'Base', 'Derived', 'Student', 'Program', 'IShape',
  'Triangle', 'Phone', 'Device', 'BankAccount', 'Person', 'CollegeStudent', 'Box', 'Abstract', 'Math',
]);

interface Token {
  text: string;
  cls?: string;
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const push = (text: string, cls?: string) => tokens.push({ text, cls });

  if (line.trimStart().startsWith('#')) {
    push(line, 'tok-pre');
    return tokens;
  }

  while (i < line.length) {
    const rest = line.slice(i);

    if (rest.startsWith('//')) {
      push(rest, 'tok-com');
      break;
    }
    if (rest.startsWith('/*')) {
      const end = line.indexOf('*/', i + 2);
      const stop = end === -1 ? line.length : end + 2;
      push(line.slice(i, stop), 'tok-com');
      i = stop;
      continue;
    }
    if (rest.startsWith('"') || rest.startsWith("'")) {
      const quote = rest[0];
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') j += 2;
        else if (line[j] === quote) {
          j += 1;
          break;
        } else j += 1;
      }
      push(line.slice(i, j), 'tok-str');
      i = j;
      continue;
    }
    if (/\d/.test(rest[0])) {
      const match = rest.match(/^\d+(\.\d+)?/);
      push(match?.[0] ?? rest[0], 'tok-num');
      i += match?.[0].length ?? 1;
      continue;
    }
    if (/[A-Za-z_]/.test(rest[0])) {
      const match = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
      const word = match?.[0] ?? rest[0];
      let cls: string | undefined;
      if (KEYWORDS.has(word)) cls = 'tok-key';
      else if (TYPES.has(word) || /^[A-Z]/.test(word)) cls = 'tok-type';
      else if (/^\s*\(/.test(line.slice(i + word.length))) cls = 'tok-fn';
      push(word, cls);
      i += word.length;
      continue;
    }
    push(rest[0], 'tok-punc');
    i += 1;
  }
  return tokens;
}

export function CodeBlock({ code, caption, maxHeight }: { code: string; caption?: string; maxHeight?: number }) {
  const lines = useMemo(() => code.replace(/\t/g, '  ').split('\n'), [code]);
  return (
    <div className="code-block">
      <div className="code-head">
        <span className="code-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="lang">C++</span>
        {caption && <span style={{ marginLeft: 'auto', opacity: 0.85 }}>{caption}</span>}
      </div>
      <div className="code-body" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        <pre>
          {lines.map((line, idx) => (
            <span className="code-line" key={idx}>
              {line.length === 0 ? ' ' : tokenizeLine(line).map((t, i) => <span key={i} className={t.cls}>{t.text}</span>)}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

export function OutputBlock({ lines }: { lines: string[] }) {
  return (
    <div className="output-block">
      <div className="output-label">Output</div>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.86em',
        background: 'var(--surface-3)',
        padding: '1px 5px',
        borderRadius: 5,
      }}
    >
      {children}
    </code>
  );
}
