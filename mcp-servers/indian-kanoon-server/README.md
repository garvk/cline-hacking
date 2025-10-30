# Indian Kanoon MCP Server

An MCP (Model Context Protocol) server that provides access to the Indian Kanoon legal database API.

## Overview

This server enables Cline to search Indian legal documents, retrieve full case texts, get document fragments, and access case metadata directly from the Indian Kanoon API.

## Available Tools

### 1. `search_cases`
Search for legal documents in the Indian Kanoon database with various filters.

**Parameters:**
- `formInput` (required): Search query. Can include:
  - Phrases in quotes: `"freedom of speech"`
  - Operators: `ANDD`, `ORR`, `NOTT` (case-sensitive, require spaces)
  - Example: `"freedom of speech" ANDD NOTT censorship`
- `pagenum` (optional): Page number, starts from 0
- `doctypes` (optional): Filter by document types
  - Courts: `supremecourt`, `delhi`, `bombay`, `kolkata`, `chennai`, `allahabad`, etc.
  - Tribunals: `aptel`, `drat`, `cat`, `itat`, `consumer`, `cci`, etc.
  - Aggregators: `tribunals`, `highcourts`, `judgments`, `laws`
  - Can comma-separate: `highcourts,cci`
- `fromdate` (optional): Minimum date in DD-MM-YYYY format (e.g., `01-10-2016`)
- `todate` (optional): Maximum date in DD-MM-YYYY format (e.g., `31-12-2023`)
- `title` (optional): Search only in document titles
- `cite` (optional): Filter by citation (e.g., `1993 AIR`)
- `author` (optional): Filter by judge who wrote the judgment
- `bench` (optional): Filter by judge on the bench
- `maxcites` (optional): Max citations per document (max 50)
- `maxpages` (optional): Fetch multiple pages in one call (max 1000)

**Example Usage:**
```
Search Indian Kanoon for Supreme Court cases about maternity leave from 2020
```

### 2. `get_document`
Retrieve the full text of a legal document by its ID.

**Parameters:**
- `docId` (required): The document ID from Indian Kanoon
- `maxcites` (optional): Max documents this document cites (max 50, default 5)
- `maxcitedby` (optional): Max documents that cite this document (max 50, default 5)

**Example Usage:**
```
Get the full text of document 123456 from Indian Kanoon
```

### 3. `get_document_fragment`
Get specific fragments of a document matching a search query.

**Parameters:**
- `docId` (required): The document ID from Indian Kanoon
- `formInput` (required): Search query to find matching fragments

**Example Usage:**
```
Find sections mentioning "bonus payment" in document 123456
```

### 4. `get_document_meta`
Retrieve metadata about a document (citations, title, court, date, etc.).

**Parameters:**
- `docId` (required): The document ID from Indian Kanoon

**Example Usage:**
```
Get metadata for document 123456
```

## Configuration

The server is configured in Cline's MCP settings at:
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

Configuration:
```json
{
  "mcpServers": {
    "indian-kanoon": {
      "disabled": false,
      "autoApprove": [],
      "command": "node",
      "args": [
        "/Users/srishti/Documents/Cline/MCP/indian-kanoon-server/build/index.js"
      ],
      "env": {
        "INDIANKANOON_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

## Building

To rebuild the server after making changes:

```bash
cd /Users/srishti/Documents/Cline/MCP/indian-kanoon-server
npm run build
```

## Usage Examples

Once the server is running, you can ask Cline:

1. **General Search:**
   - "Search Indian Kanoon for cases about employment law"
   - "Find Supreme Court judgments on fundamental rights"

2. **Filtered Search:**
   - "Search for bonus payment cases in Maharashtra High Court from 2020-2023"
   - "Find tribunal cases about POSH complaints"

3. **Document Retrieval:**
   - "Get the full text of document 123456"
   - "Show me the metadata for case 789012"

4. **Fragment Search:**
   - "Find sections mentioning 'reasonable accommodation' in document 456789"

## API Documentation

For complete API details, visit: https://api.indiankanoon.org/

## License

MIT
