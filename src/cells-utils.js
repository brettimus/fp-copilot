/**
 * Exports the given cells as Markdown.
 *
 * TODO: This does not yet apply formatting annotations.
 */
export function exportCellsAsMarkdown(cells) {
  let text = "";
  let previousCell;
  for (const cell of cells) {
    const cellText = getCellAsMarkdown(cell);

    const separator = getSeparator(cell, previousCell);
    text += `${separator}${cellText}`;

    previousCell = cell;
  }

  return text;
}

const EMPTY_DRAFTS = {};
const EMPTY_THREADS = [];

function getCellAsMarkdown(cell) {
  // NOTE - differs from studio because we assume all is selected
  const text =
    getRichCellTextUsingExternalSources(
      cell,
      EMPTY_DRAFTS,
      EMPTY_THREADS,
      undefined
    )?.text ?? "";

  switch (cell.type) {
    case "checkbox":
      return `[${cell.checked ? "x" : " "}] ${text}`;

    case "code":
      // biome-ignore lint/style/useTemplate: escaping the backticks is a mess here
      return "```\n" + text + "\n```";

    case "divider":
      return "---";

    // TODO (Oscar):
    // https://linear.app/fiberplane/project/discussion-cell-3b9038a7df70/FP
    case "discussion":
      return "";

    case "text":
      return text;

    case "graph":
    case "image":
    case "log":
    case "timeline": {
      const type = capitalize(cell.type);
      return `[${type}]`;
    }

    case "heading":
      return `${getHeadingPrefix(cell)} ${text}`;

    case "list_item":
      return `${
        cell.listType === "ordered" ? `${cell.startNumber ?? "1"}.` : "-"
      } ${text}`;

    case "provider":
      try {
        const intent = parseIntent(cell.intent);
        // INVESTIGATE - The welcome notebooks might be using old provider protocol or something?
        //               I had to manually parse the query data instead of relying on intent /shrug 
        let queryData = intent.queryData;
        if (!queryData) {
          queryData = cell.queryData?.split(QUERY_DATA_MIMETYPE_PREFIX)[1];
          if (queryData) {
            const params = new URLSearchParams(queryData); // This automatically handles decoding
            if (params?.get("query")) {
              queryData = params.get("query");
            }
          }
        }

        let text = `[provider:${formatProviderType(intent.providerType)}]`;

        if (queryData) {
          text += "\nQuery\n```\n"
          text += decodeURIComponent(queryData);
          text += "\n```\n";
        }

        if (cell.output) {
          text += `\n\n${exportCellsAsMarkdown(cell.output)}`;
        }

        return text;
      } catch (error) {
        return `[Could not format provider cell: ${error}]`;
      }

    case "table":
      return getAllRichTextFromTableCell(cell).text;
  }
}

function getSeparator(cell, previousCell) {
  if (!previousCell) {
    return "";
  }

  if (cell.type === "checkbox" && previousCell.type === "checkbox") {
    return "\n";
  }

  if (cell.type === "list_item" && previousCell.type === "list_item") {
    return "\n";
  }

  return "\n\n";
}

function getHeadingPrefix(cell) {
  switch (cell.headingType) {
    case "h1":
      return "#";
    case "h2":
      return "##";
    case "h3":
      return "###";
  }
}

/**
 * Returns all the rich text in a table cell.
 */
export function getAllRichTextFromTableCell(cell) {
  const separator = " | ";

  let text = "";
  let offset = 0;
  const formatting = [];

  for (const { title } of cell.columnDefs) {
    if (text.length > 0) {
      text += separator;
      offset += separator.length;
    }

    const titleLen = charCount(title);

    text += title;
    formatting.push(
      { offset, type: "start_bold" },
      { offset: offset + titleLen, type: "end_bold" }
    );

    offset += titleLen;
  }

  for (const row of cell.rows) {
    text += "\n";
    offset += 1;

    let columnIndex = 0;
    for (const value of row.values) {
      if (columnIndex > 0) {
        text += separator;
        offset += separator.length;
      }

      const valueTextLen = charCount(value.text);

      text += value.text;
      formatting.push(
        ...value.formatting.map((annotation) => ({
          ...annotation,
          offset: annotation.offset + offset,
        }))
      );

      offset += valueTextLen;
      columnIndex += 1;
    }
  }

  return { text, formatting };
}

/**
 * Counts the number of Unicode Scalar Values (non-surrogate codepoints) in a
 * string.
 *
 * If `index` is provided, it only counts up to the given index or up to the end
 * of the string, whichever comes first.
 *
 * Will throw if the strings ends with an unclosed surrogate pair.
 */
export function charCount(string, index) {
  let count = 0;

  const len = string.length;
  const end = index === undefined ? len : Math.min(index, len);
  for (let i = 0; i < end; i++) {
    count++;

    // Skip over surrogate pairs so they get counted as one:
    if (isHighSurrogate(string.charCodeAt(i))) {
      i++;
      if (i === len) {
        throw new Error("Unclosed surrogate pair");
      }
    }
  }

  return count;
}

/**
 * Returns when a given character code is a "high surrogate", which indicates
 * the start of a Unicode surrogate pair.
 */
export function isHighSurrogate(charCode) {
  return (charCode & 0xfc00) === 0xd800;
}

function capitalize(text) {
  return text[0]?.toUpperCase() + text.slice(1);
}

const noFormatting = [];

/**
 * Returns the text and formatting of the cell or one of its fields, either from
 * the `cell` instance directly, or an external, injectable resource such as
 * drafts or thread items.
 *
 * **NOTE:** Please keep this function in sync with
 * {@link getCellTextUsingExternalSources()} above.
 */
export function getRichCellTextUsingExternalSources(
  cell,
  drafts,
  threadItems,
  field
) {
  if (field) {
    switch (cell.type) {
      case "discussion": {
        const item = threadItems.find((item) => item.id === field);
        if (item?.type === "comment") {
          return { text: item.content, formatting: item.formatting };
        }
        const draft = drafts[field];
        return (
          draft && {
            text: draft.text,
            formatting: draft.formatting ?? noFormatting,
          }
        );
      }

      case "provider":
        return {
          text: getQueryField(cell.queryData, field),
          formatting: noFormatting,
        };

      case "table":
        return getRichTextFromTableCellField(cell, field);
    }
  }

  if (cell.type === "table") {
    return getAllRichTextFromTableCell(cell);
  }

  return {
    text: isContentCell(cell) ? cell.content : "",
    formatting: (hasFormatting(cell) && cell.formatting) || noFormatting,
  };
}

const QUERY_DATA_MIMETYPE_PREFIX = "application/x-www-form-urlencoded,";

/**
 * Parses an [Intent](https://www.notion.so/fiberplane/RFC-45-Provider-Protocol-2-0-Revised-4ec85a0233924b2db0010d8cdae75e16#c8ed5dfbfd764e6bbd5c5b79333f9d6e).
 */
export function parseIntent(intent) {
  const commaIndex = intent.indexOf(",");
  if (commaIndex === -1) {
    throw new InvalidIntentError();
  }

  let providerType = intent.slice(0, commaIndex);
  let queryType = intent.slice(commaIndex + 1);

  // Extract the data source name, if there is any:
  let dataSourceKey;
  const semicolonIndex = providerType.indexOf(";");
  if (semicolonIndex > -1) {
    dataSourceKey = providerType.slice(semicolonIndex + 1);
    providerType = providerType.slice(0, semicolonIndex);
  }

  // Extract the query data, if there is any:
  let queryData;
  const questionMarkIndex = queryType.indexOf("?");
  if (questionMarkIndex > -1) {
    queryData = `${QUERY_DATA_MIMETYPE_PREFIX}${queryType.slice(
      questionMarkIndex + 1
    )}`;
    queryType = queryType.slice(0, questionMarkIndex);
  }

  if (!providerType || !queryType) {
    throw new InvalidIntentError();
  }

  return {
    providerType,
    dataSourceKey,
    queryType,
    queryData,
  };
}

/**
 * Returns a user-friendly display name for the provider type.
 *
 * By default, provider types are simply capitalized, but some provider types
 * may be treated specially.
 */
export function formatProviderType(providerType) {
  switch (providerType) {
    case "https":
      return "HTTPS";
    default:
      return capitalize(providerType);
  }
}

/**
 * Content cell types.
 */
const contentCellTypes = ["checkbox", "code", "heading", "list_item", "text"];

export function isContentCell(cell) {
  return contentCellTypes.includes(cell.type);
}

export function hasFormatting(cell) {
  return isCellWithFormattingField(cell.type) && !isSurrogateId(cell.id);
}

const CELL_TYPES_WITH_FORMATTING_FIELD = [
  "checkbox",
  "heading",
  "list_item",
  "text",
];

function isCellWithFormattingField(cellType) {
  return CELL_TYPES_WITH_FORMATTING_FIELD.includes(cellType);
}

/**
 * Returns whether the cell ID refers to a real cell ID or a surrogate (title,
 * time range, etc..).
 */
const TITLE_CELL_ID = "__Title_cell__";

const LABELS_CELL_ID = "__Labels_cell__";
const FRONT_MATTER_CELL_ID = "__Frontmatter_cell__";

const GLOBAL_TIME_RANGE_ID = "__Global_time_selector__";

function isSurrogateId(cellId) {
  return (
    cellId === TITLE_CELL_ID ||
    cellId === GLOBAL_TIME_RANGE_ID ||
    cellId === FRONT_MATTER_CELL_ID ||
    cellId === LABELS_CELL_ID
  );
}

class InvalidIntentError extends Error {}