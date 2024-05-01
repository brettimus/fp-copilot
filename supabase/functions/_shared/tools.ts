
export const summarizeSimilarNotebooks = {
  type: "function" as const, // NOTE - to appease typescript
  function: {
    name: "summarize_similar_notebooks",
    description: "Summarizes a list of similar notebooks, returning the notebook id, title, and commander details for each.",
    parameters: {
      type: "object",
      properties: {
        notebooks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
              },
              id: {
                type: "string",
              },
              commander: {
                type: "object",
                properties: {
                  id: {
                    type: "string"
                  },
                  name: {
                    type: "string"
                  }
                }
              }
            },
          },
        },
      },
    },
  },
};


export const extractUsefulQueries = {
  type: "function" as const, // To appease typescript
  function: {
    name: "extract_useful_queries",
    description:
      "Gets useful observability data queries (between triple backticks) from an existing fiberplane notebook",
    // Describe parameters as json schema
    // https://json-schema.org/understanding-json-schema/
    parameters: {
      type: "object",
      properties: {
        datasource_queries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              query: {
                type: "string",
              },
              provider: {
                type: "string",
              },
            },
          },
        },
      },
    },
  },
};
