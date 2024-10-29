import Katex, { type KatexOptions } from "katex";
import type {
  PluginWithOptions,
  StateInline,
  ParserBlock,
  ParserInline
} from "markdown-it";
import { htmlEscape } from "@ohmycv/utils";

const isValidDelim = (
  state: StateInline,
  pos: number
): { canOpen: boolean; canClose: boolean } => {
  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 <= state.posMax ? state.src.charCodeAt(pos + 1) : -1;

  // 0x20: " ", 0x09: \t
  const isWhitespace = (char: number) => char === 0x20 || char === 0x09;
  // 0x30: "0", 0x39: "9"
  const isDigit = (char: number) => char >= 0x30 && char <= 0x39;

  const canOpen = !isWhitespace(nextChar);
  const canClose = !isWhitespace(prevChar) && !isDigit(nextChar);

  return { canOpen, canClose };
};

const mathInline: ParserInline.RuleInline = (state, silent) => {
  if (state.src[state.pos] !== "$") return false;

  const res = isValidDelim(state, state.pos);
  if (!res.canOpen) {
    if (!silent) state.pending += "$";
    state.pos += 1;
    return true;
  }

  /*
   * First check for and bypass all properly escaped delimieters
   * This loop will assume that the first leading backtick can not
   * be the first character in state.src, which is known since
   * we have found an opening delimieter already.
   */
  const start = state.pos + 1;
  let match = start;

  while ((match = state.src.indexOf("$", match)) !== -1) {
    // Found potential $, look for escapes, pos will point to
    // first non escape when complete
    let pos = match - 1;
    while (state.src[pos] === "\\") pos -= 1;

    // Even number of escapes, potential closing delimiter found
    if ((match - pos) % 2 === 1) break;

    match += 1;
  }

  // No closing delimter found.  Consume $ and continue.
  if (match === -1) {
    if (!silent) state.pending += "$";
    state.pos = start;
    return true;
  }

  // Check if we have empty content, ie: $$.  Do not parse.
  if (match - start === 0) {
    if (!silent) state.pending += "$$";
    state.pos = start + 1;
    return true;
  }

  // Check for valid closing delimiter
  const closeDelim = isValidDelim(state, match);
  if (!closeDelim.canClose) {
    if (!silent) state.pending += "$";
    state.pos = start;
    return true;
  }

  if (!silent) {
    const token = state.push("mathInline", "math", 0);
    token.markup = "$";
    token.content = state.src.slice(start, match);
  }

  state.pos = match + 1;
  return true;
};

const mathBlock: ParserBlock.RuleBlock = (state, start, end, silent) => {
  let pos = state.bMarks[start] + state.tShift[start];
  const max = state.eMarks[start];

  if (pos + 2 > max || state.src.slice(pos, pos + 2) !== "$$") return false;

  pos += 2;
  let firstLine = state.src.slice(pos, max);

  if (silent) return true;

  let found = firstLine.trim().endsWith("$$");
  // Single line expression
  if (found) firstLine = firstLine.trim().slice(0, -2);

  let next = start;
  let lastLine = "";

  while (!found) {
    next += 1;

    if (next >= end) break;

    pos = state.bMarks[next] + state.tShift[next];
    const lineMax = state.eMarks[next];

    // Non-empty line with negative indent should stop the list
    if (pos < lineMax && state.tShift[next] < state.blkIndent) break;

    const trimmedLine = state.src.slice(pos, lineMax).trim();
    if (trimmedLine.endsWith("$$")) {
      lastLine = trimmedLine.slice(0, -2);
      found = true;
    }
  }

  state.line = next + 1;

  const token = state.push("mathBlock", "math", 0);

  token.block = true;
  token.content =
    (firstLine.trim() ? `${firstLine}\n` : "") +
    state.getLines(start + 1, next, state.tShift[start], true) +
    (lastLine.trim() ? lastLine : "");
  token.map = [start, state.line];
  token.markup = "$$";

  return true;
};

/**
 * A markdown-it plugin for rendering KaTeX math expressions, improved from
 * https://github.com/waylonflinn/markdown-it-katex.
 *
 * This one is typed and has clearer code.
 */
export const MarkdownItKatex: PluginWithOptions<KatexOptions> = (
  md,
  options = { throwOnError: false }
) => {
  const renderKatex = (
    tex: string,
    options: KatexOptions,
    displayMode: boolean // Whether to render as block math
  ): string => {
    options.displayMode = displayMode;

    try {
      return displayMode
        ? `<p>${Katex.renderToString(tex, options)}</p>\n`
        : Katex.renderToString(tex, options);
    } catch (error) {
      if (options.throwOnError) console.warn(error);

      const errorMsg = htmlEscape((error as Error).toString());
      const escapedTex = htmlEscape(tex);

      return displayMode
        ? `<p class='katex-error' title='${errorMsg}'>${escapedTex}</p>\n`
        : `<span title='${errorMsg}'>${escapedTex}</span>`;
    }
  };

  md.inline.ruler.after("escape", "mathInline", mathInline);
  md.block.ruler.after("blockquote", "mathBlock", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"]
  });

  md.renderer.rules.mathInline = (tokens, idx): string =>
    renderKatex(tokens[idx].content, options, false);
  md.renderer.rules.mathBlock = (tokens, idx): string =>
    renderKatex(tokens[idx].content, options, true);
};

export default MarkdownItKatex;
