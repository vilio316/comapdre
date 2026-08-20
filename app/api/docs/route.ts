import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Compadre API",
    summary: "Backend API for the Compadre study companion app.",
    version: "2.0.0",
  },
  servers: [
    {
      url: "/",
      description: "Relative API base path",
    },
  ],
  paths: {
    "/api/upload": {
      post: {
        summary: "Upload a file to cloud storage",
        description:
          "Accepts a file (PDF, DOCX, image, or text) with optional tags, uploads it to Cloudflare R2, and records it as a document in the caller's active class. Requires an authenticated session with an active class selected.",
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
                    description: "The file to upload (PDF, DOCX, image, or text).",
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
                    key: {
                      type: "string",
                      description:
                        "Storage key of the uploaded document (organizationId/fileName).",
                    },
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
          "401": {
            description: "Unauthenticated or no active class selected.",
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
    "/api/upload/avatar": {
      post: {
        summary: "Upload a profile picture",
        description:
          "Uploads a JPEG, PNG, or WEBP image (max 5 MB) as the current user's avatar. Replaces any previously uploaded avatar in the avatars/ key prefix.",
        operationId: "uploadAvatar",
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
                    description: "Image file (JPEG, PNG, or WEBP, max 5 MB).",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Avatar uploaded successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    image: {
                      type: "string",
                      description: "Storage key of the uploaded avatar.",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description:
              "No file provided, unsupported file type, or file too large.",
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
          "401": {
            description: "Unauthenticated.",
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
            description: "Avatar upload failed.",
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
    "/api/avatar": {
      get: {
        summary: "Get a signed URL for the user's avatar",
        description:
          "Resolves the current user's avatar to a signed URL when stored in the avatars/ key prefix, or returns the raw image URL for externally hosted avatars. Returns null when the user has no avatar.",
        operationId: "getAvatar",
        responses: {
          "200": {
            description: "Avatar URL.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      nullable: true,
                      description: "Signed or raw avatar URL, or null.",
                    },
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
        summary: "List all uploaded documents in the active class",
        description:
          "Returns an array of document metadata for every file stored for the caller's active class/organization. Documents are scoped to the active class selected via the session.",
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
          "401": {
            description: "Unauthenticated or no active class selected.",
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
    "/api/ocr": {
      post: {
        summary: "Extract text from uploaded images",
        description:
          "Accepts one or more image files, saves them to a temporary location, and enqueues an OCR job. The returned jobId can be polled via GET /api/ocr/status/{jobId}. For multiple images the prompt asks Gemini to summarise all contents into a single response.",
        operationId: "submitLocalOcr",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["files"],
                properties: {
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description: "One or more image files (PNG, JPG, WEBP).",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OCR job enqueued.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobId: { type: "string", description: "BullMQ job ID to poll for results." },
                  },
                },
              },
            },
          },
          "400": {
            description: "No files provided.",
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
            description: "OCR submission failed.",
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
    "/api/ocr/status/{jobId}": {
      get: {
        summary: "Poll the result of an OCR job",
        description:
          "Returns the current status of an OCR job. When status is 'done', the result field contains the extracted text. When 'failed', the error field describes the failure.",
        operationId: "getOcrStatus",
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Job ID returned by POST /api/ocr or POST /api/documents/{key}/ocr.",
          },
        ],
        responses: {
          "200": {
            description: "Job status.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["done", "failed", "processing"],
                      description: "Current job state.",
                    },
                    result: {
                      type: "string",
                      description: "Extracted/sanitised text (present when status is 'done').",
                    },
                    error: {
                      type: "string",
                      description: "Error message (present when status is 'failed').",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Job not found.",
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
    "/api/mcq": {
      post: {
        summary: "Generate multiple-choice questions",
        description:
          "Accepts uploaded files and/or stored document keys and enqueues an MCQ generation job. Optionally accepts a count (clamped to a maximum). Returns a cached result immediately when the same inputs were previously generated, otherwise returns a jobId to poll via GET /api/mcq/status/{jobId}, along with a resultKey for fetching the generated questions via GET /api/mcq/result.",
        operationId: "generateMcqs",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description:
                      "Uploaded source files (PDF, DOCX, PPTX, images).",
                  },
                  keys: {
                    type: "array",
                    items: { type: "string" },
                    description: "Stored document keys in the active class.",
                  },
                  count: {
                    type: "number",
                    default: 20,
                    description: "Number of questions to generate (1 to MAX).",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cached result or new job enqueued.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cached: {
                      type: "boolean",
                      description: "True when the result was served from cache.",
                    },
                    resultKey: {
                      type: "string",
                      description:
                        "Storage/cache key for the generated questions.",
                    },
                    jobId: {
                      type: "string",
                      description: "BullMQ job ID to poll (present when cached is false).",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "No files or keys provided, or limits exceeded.",
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
          "401": {
            description: "Unauthenticated or no active class selected.",
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
            description: "MCQ submission failed.",
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
    "/api/mcq/status/{jobId}": {
      get: {
        summary: "Poll the result of an MCQ generation job",
        description:
          "Returns the current status of an MCQ job. When status is 'done', the resultKey field can be used to fetch the questions via GET /api/mcq/result. When 'failed', the error field describes the failure.",
        operationId: "getMcqStatus",
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Job ID returned by POST /api/mcq.",
          },
        ],
        responses: {
          "200": {
            description: "Job status.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["done", "failed", "processing"],
                      description: "Current job state.",
                    },
                    resultKey: {
                      type: "string",
                      description:
                        "Key for fetching the questions via GET /api/mcq/result.",
                    },
                    error: {
                      type: "string",
                      description: "Error message (present when status is 'failed').",
                    },
                    createdAt: {
                      type: "number",
                      description: "Job creation timestamp (Unix ms).",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "404": {
            description: "Job not found.",
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
    "/api/mcq/result": {
      get: {
        summary: "Get generated MCQ questions by key",
        description:
          "Returns the cached MCQ json result for a resultKey produced by POST /api/mcq.",
        operationId: "getMcqResult",
        parameters: [
          {
            name: "key",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "resultKey returned by POST /api/mcq or /api/mcq/status.",
          },
        ],
        responses: {
          "200": {
            description: "Generated questions payload.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/McqQuestion" },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing key.",
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
          "401": {
            description: "Unauthenticated.",
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
          "404": {
            description: "Result not found.",
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
    "/api/mcq/history": {
      get: {
        summary: "List MCQ generation history for the active class",
        description:
          "Returns up to 100 recent MCQ generation entries for the caller's active class.",
        operationId: "listMcqHistory",
        responses: {
          "200": {
            description: "History entries.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    history: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          resultKey: { type: "string" },
                          keys: {
                            type: "array",
                            items: { type: "string" },
                          },
                          count: { type: "number" },
                          createdAt: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
            description: "Failed to load history.",
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
    "/api/documents/{key}/ocr": {
      post: {
        summary: "Extract text from a stored document",
        description:
          "Generates a signed URL for the stored document and enqueues an OCR job. Supports images (PNG, JPG, WEBP) and documents (PDF, DOCX). Images are sent by URI; documents are downloaded and sent as base64. Results are cached in Redis for 30 days. If a cached result exists it is returned immediately without enqueuing a job. If an active job for the same key already exists its existing jobId is returned to prevent duplicates. Scoped to the caller's active class.",
        operationId: "submitDocumentOcr",
        parameters: [
          {
            name: "key",
            in: "path",
            required: true,
            schema: { type: "string" },
            description:
              "URL-encoded file key (filename as stored in the bucket).",
          },
        ],
        responses: {
          "200": {
            description: "Cached result or new job enqueued.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cached: {
                      type: "boolean",
                      description: "True if the result was served from cache.",
                    },
                    result: {
                      type: "string",
                      description: "Extracted text (present when cached is true).",
                    },
                    jobId: {
                      type: "string",
                      description: "BullMQ job ID to poll (present when cached is false).",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated or no active class selected.",
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
          "404": {
            description: "Document not found.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    success: { type: "boolean", enum: [false] },
                  },
                },
              },
            },
          },
          "500": {
            description: "Failed to queue document OCR.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    success: { type: "boolean", enum: [false] },
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
          "Returns a time-limited signed URL (1 hour) to view or download a document by its file key, scoped to the caller's active class. For text files (md, txt) the file contents are also fetched and returned in the text field.",
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
                      enum: ["pdf", "docx", "jpeg", "png", "md", "txt", "other"],
                      description: "Detected file type.",
                    },
                    text: {
                      type: "string",
                      description: "File contents (present for text files).",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated or no active class selected.",
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
          "404": {
            description: "Document not found in the active class.",
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
          "Permanently deletes a file from the R2 bucket by its file key and removes its record. Restricted to class representatives, admins, and owners of the active class.",
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
          "401": {
            description: "Unauthenticated or no active class selected.",
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
          "403": {
            description: "User role cannot delete documents.",
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
          "404": {
            description: "Document not found in the active class.",
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
    "/api/compile": {
      post: {
        summary: "Compile (merge) documents into a single text output",
        description:
          "Accepts uploaded files and/or stored document keys, OCRs them in the background, and merges their extracted text into a single compilation. Requires an active class and a role of owner, admin, or class_rep. Returns a jobId to poll via GET /api/compile/status/{jobId}.",
        operationId: "submitCompile",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description:
                      "Uploaded source files (PDF, DOCX, PPT/PPTX, images).",
                  },
                  keys: {
                    type: "array",
                    items: { type: "string" },
                    description: "Stored document keys in the active class.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Compile job enqueued.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobId: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "No files or keys provided, or limits exceeded.",
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
          "401": {
            description: "Unauthenticated or no active class selected.",
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
          "403": {
            description: "User role cannot compile documents.",
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
            description: "Compilation submission failed.",
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
    "/api/compile/status/{jobId}": {
      get: {
        summary: "Poll the result of a compilation job",
        description:
          "Returns the current status of a compile job. When status is 'done', the result field contains the compiled text and the list of source names. When 'failed', the error field describes the failure.",
        operationId: "getCompileStatus",
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Job ID returned by POST /api/compile.",
          },
        ],
        responses: {
          "200": {
            description: "Job status.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["done", "failed", "processing"],
                      description: "Current job state.",
                    },
                    result: {
                      type: "object",
                      description: "Present when status is 'done'.",
                      properties: {
                        text: {
                          type: "string",
                          description: "Merged compiled text.",
                        },
                        sources: {
                          type: "array",
                          items: { type: "string" },
                          description: "Names of the compiled source documents.",
                        },
                      },
                    },
                    error: {
                      type: "string",
                      description: "Error message (present when status is 'failed').",
                    },
                    createdAt: {
                      type: "number",
                      description: "Job creation timestamp (Unix ms).",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "404": {
            description: "Job not found.",
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
    "/api/compile/pdf": {
      post: {
        summary: "Render compiled text as a PDF document",
        description:
          "Renders the provided markdown text into a PDF and saves it as a new document in the active class. Requires a role of owner, admin, or class_rep.",
        operationId: "submitPdf",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", description: "Compiled text to render." },
                  fileName: {
                    type: "string",
                    description: "Name for the generated PDF document.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "PDF job enqueued.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobId: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing or oversized text.",
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
          "401": {
            description: "Unauthenticated or no active class selected.",
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
          "403": {
            description: "User role cannot save compiled documents.",
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
            description: "PDF submission failed.",
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
    "/api/compile/pdf/status/{jobId}": {
      get: {
        summary: "Poll the result of a PDF generation job",
        description:
          "Returns the current status of a PDF job. When status is 'done', the result field contains the saved document metadata. When 'failed', the error field describes the failure.",
        operationId: "getPdfStatus",
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Job ID returned by POST /api/compile/pdf.",
          },
        ],
        responses: {
          "200": {
            description: "Job status.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["done", "failed", "processing"],
                      description: "Current job state.",
                    },
                    result: {
                      type: "object",
                      description: "Present when status is 'done'.",
                      properties: {
                        doc: {
                          type: "object",
                          properties: {
                            key: { type: "string" },
                            name: { type: "string" },
                            type: { type: "string" },
                            size: { type: "number" },
                          },
                        },
                      },
                    },
                    error: {
                      type: "string",
                      description: "Error message (present when status is 'failed').",
                    },
                    createdAt: {
                      type: "number",
                      description: "Job creation timestamp (Unix ms).",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "404": {
            description: "Job not found.",
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
    "/api/classes": {
      get: {
        summary: "List the caller's classes",
        description:
          "Returns the classes (organizations) the current user is a member of, including the user's role in each, the class rep name, and member count.",
        operationId: "listClasses",
        responses: {
          "200": {
            description: "List of classes.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    classes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Class" },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
            description: "Failed to list classes.",
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
      post: {
        summary: "Create a new class",
        description:
          "Creates a new class (organization) with the caller as its class rep. A short join code/slug is generated automatically. Returns the created class.",
        operationId: "createClass",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    description: "Class name (100 characters or fewer).",
                  },
                  description: {
                    type: "string",
                    description: "Optional description (500 characters or fewer).",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Class created.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    class: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        code: {
                          type: "string",
                          description: "Short join code/slug.",
                        },
                        description: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid JSON body, missing name, or name too long.",
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
          "401": {
            description: "Unauthenticated.",
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
            description: "Failed to create class.",
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
    "/api/classes/search": {
      get: {
        summary: "Search for classes to join",
        description:
          "Searches public classes by name or join code. Returns at most 20 matches.",
        operationId: "searchClasses",
        parameters: [
          {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search query matching class name or code.",
          },
        ],
        responses: {
          "200": {
            description: "Search results.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    classes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          code: { type: "string" },
                          description: { type: "string", nullable: true },
                          classRepName: { type: "string", nullable: true },
                          memberCount: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Search query too long.",
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
          "401": {
            description: "Unauthenticated.",
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
            description: "Failed to search classes.",
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
    "/api/classes/{id}": {
      get: {
        summary: "Get a class's detail",
        description:
          "Returns the class detail, its members, and (for owner/admin/class_rep roles) pending invitations. Only members of the class can access it.",
        operationId: "getClassDetail",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Class (organization) id.",
          },
        ],
        responses: {
          "200": {
            description: "Class detail.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    class: { $ref: "#/components/schemas/Class" },
                    canInvite: {
                      type: "boolean",
                      description: "Whether the caller may create invitations.",
                    },
                    members: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ClassMember" },
                    },
                    invitations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ClassInvitation" },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "403": {
            description: "Caller is not a member of the class.",
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
          "404": {
            description: "Class not found.",
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
            description: "Failed to fetch class detail.",
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
    "/api/classes/{id}/join": {
      post: {
        summary: "Join a class by id",
        description:
          "Adds the caller to the class as a member. Returns 409 if the caller is already a member.",
        operationId: "joinClass",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Class (organization) id.",
          },
        ],
        responses: {
          "200": {
            description: "Joined the class.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    class: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        code: { type: "string" },
                        description: { type: "string", nullable: true },
                        role: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "404": {
            description: "Class not found.",
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
          "409": {
            description: "Already a member.",
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
            description: "Failed to join class.",
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
    "/api/classes/{id}/documents": {
      get: {
        summary: "List a class's documents",
        description:
          "Returns document metadata for every file uploaded to the class. Requires the caller to be a member of the class.",
        operationId: "listClassDocuments",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Class (organization) id.",
          },
        ],
        responses: {
          "200": {
            description: "List of class documents.",
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
          "401": {
            description: "Unauthenticated.",
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
          "403": {
            description: "Caller is not a member of the class.",
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
    "/api/classes/{id}/invitations": {
      get: {
        summary: "List a class's invitations",
        description:
          "Returns all invitations for the class. Requires the caller to be a member of the class. Invitation URLs are absolute links usable by anyone with the link.",
        operationId: "listClassInvitations",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Class (organization) id.",
          },
        ],
        responses: {
          "200": {
            description: "List of invitations.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    invitations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ClassInvitation" },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "403": {
            description: "Caller is not a member of the class.",
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
            description: "Failed to list invitations.",
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
      post: {
        summary: "Create a class invitation link",
        description:
          "Creates a pending invitation link for the class. Requires the caller to be an owner, admin, or class_rep. The role defaults to 'member' when not provided or invalid.",
        operationId: "createClassInvitation",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Class (organization) id.",
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: {
                    type: "string",
                    enum: ["member", "admin", "class_rep"],
                    description: "Role to grant on join (default 'member').",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Invitation created.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    invitation: { $ref: "#/components/schemas/ClassInvitation" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid JSON body.",
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
          "401": {
            description: "Unauthenticated.",
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
          "403": {
            description: "Not a member or no permission to invite.",
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
            description: "Failed to create invitation.",
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
    "/api/classes/{id}/invitations/{invitationId}": {
      delete: {
        summary: "Cancel a class invitation",
        description:
          "Marks a pending invitation as cancelled so the link stops working. Requires the caller to be an owner, admin, or class_rep of the class.",
        operationId: "cancelClassInvitation",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Class (organization) id.",
          },
          {
            name: "invitationId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Invitation id to cancel.",
          },
        ],
        responses: {
          "200": {
            description: "Invitation cancelled.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", enum: [true] },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "403": {
            description: "Not a member or no permission to cancel invitations.",
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
          "404": {
            description: "Invitation not found.",
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
            description: "Failed to cancel invitation.",
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
    "/api/classes/invite/{invitationId}": {
      get: {
        summary: "Get an invitation's details by link",
        description:
          "Public endpoint used when a user opens an invitation link. Returns the invitation details if it is pending and not expired. No authentication required.",
        operationId: "getInvitationLink",
        parameters: [
          {
            name: "invitationId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Invitation id.",
          },
        ],
        responses: {
          "200": {
            description: "Invitation details.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    invitation: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        role: { type: "string" },
                        expiresAt: { type: "string", format: "date-time" },
                        createdAt: { type: "string", format: "date-time" },
                        organizationId: { type: "string" },
                        organizationName: { type: "string" },
                        organizationSlug: { type: "string" },
                        inviterName: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Invite link is expired or no longer available.",
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
            description: "Failed to load invite link.",
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
      post: {
        summary: "Accept an invitation by link",
        description:
          "Adds the signed-in caller to the class with the role granted by the invitation. Returns 409 if the caller is already a member.",
        operationId: "acceptInvitationLink",
        parameters: [
          {
            name: "invitationId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Invitation id.",
          },
        ],
        responses: {
          "200": {
            description: "Joined the class.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    member: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        role: { type: "string" },
                        organizationId: { type: "string" },
                      },
                    },
                    invitation: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        status: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthenticated.",
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
          "404": {
            description: "Invite link is expired, no longer available, or class not found.",
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
          "409": {
            description: "Already a member.",
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
            description: "Failed to accept invitation.",
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
                        image: {
                          type: "string",
                          format: "uri",
                          nullable: true,
                        },
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
          id: {
            type: "string",
            description: "File key (filename) in the bucket.",
          },
          name: { type: "string", description: "File name." },
          type: {
            type: "string",
            enum: ["pdf", "docx", "jpeg", "png", "md", "txt", "other"],
            description: "Detected file type from extension.",
          },
          size: {
            type: "string",
            description: "Human-readable file size (e.g. 2.4 MB).",
          },
          uploaded: {
            type: "string",
            format: "date",
            description: "Upload date (YYYY-MM-DD).",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "User-assigned tags.",
          },
        },
      },
      McqQuestion: {
        type: "object",
        properties: {
          q: { type: "string", description: "The question text." },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Four answer options.",
          },
          answer: {
            type: "number",
            description: "0-based index of the correct option.",
          },
        },
      },
      Class: {
        type: "object",
        properties: {
          id: { type: "string", description: "Class (organization) id." },
          name: { type: "string", description: "Class name." },
          code: { type: "string", description: "Short join code/slug." },
          description: { type: "string", nullable: true },
          role: {
            type: "string",
            enum: ["owner", "admin", "class_rep", "member"],
            description: "The caller's role in this class.",
          },
          classRepName: { type: "string", nullable: true },
          memberCount: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ClassMember: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: {
            type: "string",
            enum: ["owner", "admin", "class_rep", "member"],
          },
          joinedAt: { type: "string", format: "date-time" },
        },
      },
      ClassInvitation: {
        type: "object",
        properties: {
          id: { type: "string" },
          role: {
            type: "string",
            enum: ["member", "admin", "class_rep"],
          },
          status: {
            type: "string",
            enum: ["pending", "accepted", "canceled"],
          },
          expiresAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          inviteUrl: {
            type: "string",
            format: "uri",
            description: "Absolute invitation link.",
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
