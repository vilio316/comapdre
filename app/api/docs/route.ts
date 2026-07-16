import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Compadre API",
    summary: "Backend API for the Compadre study companion app.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "/api",
      description: "Relative API base path",
    },
  ],
  paths: {
    "/api/upload": {
      post: {
        summary: "Upload a file to cloud storage",
        description:
          "Accepts a PDF or DOCX file (max 30 MB) with optional tags and uploads it to Cloudflare R2.",
        operationId: "uploadFile",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "The file to upload (PDF or DOCX, max 30 MB).",
                  },
                  tags: {
                    type: "string",
                    description:
                      'Optional JSON-encoded array of tag strings, e.g. ["biology","notes"].',
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "File uploaded successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                  },
                },
              },
            },
          },
          "400": {
            description: "No file provided.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Upload failed due to a server error.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/documents": {
      get: {
        summary: "List all uploaded documents",
        description:
          "Returns an array of document metadata for every file stored in the R2 bucket.",
        operationId: "listDocuments",
        responses: {
          "200": {
            description: "List of documents.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    docs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Document" },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Failed to list documents.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/documents/{key}": {
      get: {
        summary: "Get a signed URL for a specific document",
        description:
          "Returns a time-limited signed URL (1 hour) to view or download a document by its file key.",
        operationId: "getDocumentUrl",
        parameters: [
          {
            name: "key",
            in: "path",
            required: true,
            schema: { type: "string" },
            description:
              "URL-encoded file key (filename as stored in the bucket, e.g. Biology_Ch3_Notes.pdf).",
          },
        ],
        responses: {
          "200": {
            description: "Signed URL generated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      description: "Pre-signed URL valid for 1 hour.",
                    },
                    name: {
                      type: "string",
                      description: "The original file name.",
                    },
                    type: {
                      type: "string",
                      enum: ["pdf", "docx", "other"],
                      description: "Detected file type.",
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Failed to retrieve document URL.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        summary: "Delete a document from storage",
        description:
          "Permanently deletes a file from the R2 bucket by its file key.",
        operationId: "deleteDocument",
        parameters: [
          {
            name: "key",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "URL-encoded file key to delete.",
          },
        ],
        responses: {
          "200": {
            description: "Document deleted successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                  },
                },
              },
            },
          },
          "500": {
            description: "Failed to delete document.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        summary: "Sign in with email and password",
        operationId: "signInEmail",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sign-in successful. Session cookie set." },
          "401": { description: "Invalid credentials." },
        },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        summary: "Create a new account with email and password",
        operationId: "signUpEmail",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Account created. Session cookie set." },
          "400": { description: "Validation error or email already in use." },
        },
      },
    },
    "/api/auth/sign-out": {
      post: {
        summary: "Sign out the current session",
        operationId: "signOut",
        responses: {
          "200": { description: "Signed out. Session cookie cleared." },
        },
      },
    },
    "/api/auth/session": {
      get: {
        summary: "Get the current session",
        operationId: "getSession",
        responses: {
          "200": {
            description: "Current session data or null.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      nullable: true,
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        image: { type: "string", format: "uri", nullable: true },
                      },
                    },
                    session: { type: "object", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/oauth2/authorize": {
      get: {
        summary: "Initiate OAuth2 sign-in (Google / Apple)",
        operationId: "oauthAuthorize",
        parameters: [
          {
            name: "provider",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["google", "apple"] },
          },
        ],
        responses: {
          "302": { description: "Redirects to the OAuth provider." },
        },
      },
    },
    "/api/docs": {
      get: {
        summary: "View the SwaggerUI API documentation",
        operationId: "getApiDocs",
        responses: {
          "200": {
            description: "SwaggerUI HTML page.",
            content: { "text/html": { schema: { type: "string" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Document: {
        type: "object",
        properties: {
          id: { type: "string", description: "File key (filename) in the bucket." },
          name: { type: "string", description: "File name." },
          type: {
            type: "string",
            enum: ["PDF", "DOCX", "FILE"],
            description: "Detected file type from extension.",
          },
          size: { type: "string", description: "Human-readable file size (e.g. 2.4 MB)." },
          uploaded: {
            type: "string",
            format: "date",
            description: "Upload date (YYYY-MM-DD).",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "User-assigned tags (currently empty from API).",
          },
        },
      },
    },
  },
};

const specJson = JSON.stringify(spec, null, 2);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Compadre API — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.20.1/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f5f5f5; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.20.1/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${specJson},
      dom_id: '#swagger-ui',
      layout: 'BaseLayout',
      deepLinking: true,
      displayOperationId: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
    });
  </script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
