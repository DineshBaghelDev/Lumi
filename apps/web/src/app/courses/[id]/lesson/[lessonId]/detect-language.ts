/**
 * Heuristic language detection for code blocks that lack an explicit language tag.
 *
 * Returns a Shiki-compatible language ID or "text" if no confident match.
 * Designed for the common languages in a technical learning platform:
 * JS/TS, Python, Rust, Go, SQL, HTML, CSS, JSON, Bash, Java, C, C++.
 */

type Rule = { lang: string; patterns: RegExp[] };

const rules: Rule[] = [
  {
    lang: "python",
    patterns: [
      /^\s*(def|class|import|from|elif|except|lambda|with|async|await)\s/m,
      /^\s*print\s*\(/m,
      /self\./,
      /__\w+__/,
    ],
  },
  {
    lang: "rust",
    patterns: [
      /\b(fn|let\s+mut|impl|pub|crate|mod|match|enum|struct|trait|where|loop)\b/,
      /->\s*\w+/,
      /\b(Option|Result|Vec|String|Box|Rc|Arc|Some|None|Ok|Err)\b/,
      /!\s*\(/,
    ],
  },
  {
    lang: "go",
    patterns: [
      /\b(package|func|defer|go\s+|chan|select|make|len|cap)\b/,
      /:=/,
      /\bfmt\.\w+/,
      /\berrors\.New\b/,
    ],
  },
  {
    lang: "java",
    patterns: [
      /\b(public|private|protected)\s+(static\s+)?(void|int|String|class|interface)\b/,
      /\bSystem\.out\.print/,
      /@Override/,
    ],
  },
  {
    lang: "sql",
    patterns: [
      /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|HAVING)\b/im,
      /\bINTO\s+VALUES\b/i,
      /\bPRIMARY\s+KEY\b/i,
      /\bLEFT\s+JOIN\b/i,
    ],
  },
  {
    lang: "html",
    patterns: [
      /<!DOCTYPE\s+html>/i,
      /<html[\s>]/i,
      /<head[\s>]/i,
      /<body[\s>]/i,
      /<div[\s>]/i,
      /<\/\w+>/,
    ],
  },
  {
    lang: "css",
    patterns: [
      /\w+\s*:\s*(#[0-9a-fA-F]+|[\w.-]+(?:px|em|rem|%|vh|vw)?);/,
      /@(media|keyframes|import|font-face)/,
      /\.\w+\s*\{/,
      /#\w+\s*\{/,
    ],
  },
  {
    lang: "json",
    patterns: [
      /^\s*\{[\s\S]*"\w+"\s*:/,
      /^\s*\[[\s\S]*\{[\s\S]*\}/,
    ],
  },
  {
    lang: "bash",
    patterns: [
      /^#!/m,
      /\b(echo|export|source|alias|sudo|chmod|mkdir|grep|awk|sed|curl|wget)\b/,
      /\$\{?\w+\}?/,
    ],
  },
  {
    lang: "typescript",
    patterns: [
      /:\s*(string|number|boolean|void|any|never|unknown|null|undefined)\b/,
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /\bas\s+\w+/,
      /\bRecord<|Partial<|Pick<|Omit</,
    ],
  },
  {
    lang: "javascript",
    patterns: [
      /\b(const|let|var)\s+\w+\s*=/,
      /\b(function|=>|async|await|import\s+.*from|export\s+(default|const|function|class))\b/,
      /\bconsole\.(log|error|warn)\b/,
      /\bdocument\.\w+/,
      /\bwindow\.\w+/,
      /\bPromise\b/,
      /\bReact\b/,
    ],
  },
  {
    lang: "c",
    patterns: [
      /\b(printf|scanf|malloc|free|sizeof|typedef)\b/,
      /#include\s*<[\w.]+>/,
    ],
  },
  {
    lang: "cpp",
    patterns: [
      /\b(cout|cin|endl|std::|vector|map|set|namespace|template)\b/,
      /#include\s*<[\w.]+>/,
      /\bstd::\w+/,
    ],
  },
];

/**
 * Detect the most likely language for a code snippet.
 * Returns a Shiki language ID or "text" if uncertain.
 */
export function detectLanguage(code: string): string {
  const trimmed = code.trim();
  if (trimmed.length === 0) return "text";

  let bestLang = "text";
  let bestScore = 0;

  for (const rule of rules) {
    let score = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = rule.lang;
    }
  }

  // Require at least 1 matching pattern for a confident match.
  // The distinct pattern sets per language make false positives unlikely.
  return bestScore >= 1 ? bestLang : "text";
}
