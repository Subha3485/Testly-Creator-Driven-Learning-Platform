import React from "react";

function normalizeSegments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((segment) => {
      if (typeof segment === "string") {
        return { text: segment };
      }

      if (!segment || typeof segment !== "object") {
        return null;
      }

      return {
        text: String(segment.text || ""),
        bold: Boolean(segment.bold),
        italic: Boolean(segment.italic),
        underline: Boolean(segment.underline)
      };
    })
    .filter((segment) => segment && segment.text);
}

function parseMarkdownBold(value) {
  const input = String(value || "");
  if (!input) {
    return [];
  }

  const segments = [];
  const pattern = /\*\*([\s\S]+?)\*\*/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > cursor) {
      segments.push({ text: input.slice(cursor, match.index) });
    }
    segments.push({ text: match[1], bold: true });
    cursor = pattern.lastIndex;
  }

  if (cursor < input.length) {
    segments.push({ text: input.slice(cursor) });
  }

  return segments;
}

export default function RichText({ value, segments, html, className = "" }) {
  const htmlValue = typeof html === "string" ? html : "";
  if (htmlValue) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: htmlValue }} />;
  }

  const richSegments = normalizeSegments(segments);
  const parts = richSegments.length ? richSegments : parseMarkdownBold(value);

  if (!parts.length) {
    return null;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const style = {
          fontWeight: part.bold ? 700 : undefined,
          fontStyle: part.italic ? "italic" : undefined,
          textDecoration: part.underline ? "underline" : undefined
        };

        return (
          <React.Fragment key={`${index}-${part.text.slice(0, 12)}`}>
            <span style={style}>{part.text}</span>
          </React.Fragment>
        );
      })}
    </span>
  );
}
