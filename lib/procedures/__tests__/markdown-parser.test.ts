/**
 * Unit Tests - Markdown Parser
 * Tests for parsing BRCGS procedure markdown files
 * Target: >95% coverage
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MarkdownParser } from '../markdown-parser';
import type { IFileReader, ILogger } from '../types';

describe('MarkdownParser', () => {
  let mockFileReader: jest.Mocked<IFileReader>;
  let mockLogger: jest.Mocked<ILogger>;
  let parser: MarkdownParser;

  beforeEach(() => {
    mockFileReader = {
      readFile: jest.fn(),
      fileExists: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    parser = new MarkdownParser(mockFileReader, mockLogger);
  });

  describe('constructor', () => {
    test('should initialize and log', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('MarkdownParser initialized');
    });
  });

  describe('parseFile', () => {
    test('should parse file with YAML frontmatter successfully', async () => {
      const filePath = '/path/to/5.7-control-non-conforming.md';
      const markdown = `---
document_number: 5.7
document_name: Control of Non-Conforming Product
revision: 9
effective_date: 2025-01-15
summary: Procedures for handling non-conforming products
---

# Content
Main procedure content here.`;

      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockResolvedValue(markdown);

      const result = await parser.parseFile(filePath);

      expect(result.metadata.document_number).toBe('5.7');
      expect(result.metadata.document_name).toBe('Control of Non-Conforming Product');
      expect(result.metadata.revision).toBe(9);
      expect(result.metadata.effective_date).toBe('2025-01-15');
      expect(result.metadata.summary).toBe('Procedures for handling non-conforming products');
      expect(result.content).toBe('# Content\nMain procedure content here.');
      expect(result.filePath).toBe(filePath);
      expect(mockLogger.info).toHaveBeenCalledWith(`Parsing file: ${filePath}`);
    });

    test('should throw error when file does not exist', async () => {
      const filePath = '/path/to/nonexistent.md';
      mockFileReader.fileExists.mockResolvedValue(false);

      await expect(parser.parseFile(filePath)).rejects.toThrow('File not found: /path/to/nonexistent.md');
    });

    test('should parse file with structured headers', async () => {
      const filePath = '/path/to/3.10-complaint-handling.md';
      const markdown = `## Document metadata
- **Document Number:** 3.10
- **Document Name:** Complaint Handling
- **Revision:** 5
- **Effective Date:** 2025-02-01

## Summary
This procedure outlines complaint handling processes.

## Content
Main content here.`;

      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockResolvedValue(markdown);

      const result = await parser.parseFile(filePath);

      expect(result.metadata.document_number).toBe('3.10');
      expect(result.metadata.document_name).toBe('Complaint Handling');
      expect(result.metadata.revision).toBe(5);
      expect(result.metadata.effective_date).toBe('2025-02-01');
    });

    test('should extract document number from filename as fallback', async () => {
      const filePath = '/path/to/4.10-waste-reconciliation.md';
      const markdown = `# Waste Reconciliation
Content without frontmatter.`;

      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockResolvedValue(markdown);

      const result = await parser.parseFile(filePath);

      expect(result.metadata.document_number).toBe('4.10');
      expect(result.metadata.document_name).toBe('4.10-waste-reconciliation');
    });

    test('should handle Windows file paths', async () => {
      const filePath = 'C:\\Users\\docs\\5.7-procedure.md';
      const markdown = `---
document_number: 5.7
document_name: Test Procedure
---
Content`;

      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockResolvedValue(markdown);

      const result = await parser.parseFile(filePath);

      expect(result.metadata.document_number).toBe('5.7');
      expect(result.filePath).toBe(filePath);
    });

    test('should handle file read errors', async () => {
      const filePath = '/path/to/error.md';
      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockRejectedValue(new Error('Read permission denied'));

      await expect(parser.parseFile(filePath)).rejects.toThrow('Read permission denied');
    });
  });

  describe('extractMetadata', () => {
    describe('YAML frontmatter parsing', () => {
      test('should parse complete YAML frontmatter', () => {
        const content = `---
document_number: 5.7
document_name: Control of Non-Conforming Product
revision: 9
effective_date: 2025-01-15
summary: Comprehensive procedure for handling non-conformances
key_requirements: ["Segregation", "Investigation", "Disposition"]
integration_points: ["NCAs", "Quality Control"]
form_sections: ["Section 1", "Section 2"]
---
Content here`;

        const metadata = parser.extractMetadata(content, '5.7-procedure.md');

        expect(metadata.document_number).toBe('5.7');
        expect(metadata.document_name).toBe('Control of Non-Conforming Product');
        expect(metadata.revision).toBe(9);
        expect(metadata.effective_date).toBe('2025-01-15');
        expect(metadata.summary).toBe('Comprehensive procedure for handling non-conformances');
      });

      test('should handle YAML with quoted values', () => {
        const content = `---
document_number: "3.10"
document_name: "Complaint Handling"
revision: "12"
effective_date: "2025-03-01"
summary: "Handle customer complaints"
---
Content`;

        const metadata = parser.extractMetadata(content, 'complaint.md');

        expect(metadata.document_number).toBe('3.10');
        expect(metadata.document_name).toBe('Complaint Handling');
        expect(metadata.revision).toBe(12);
        expect(metadata.effective_date).toBe('2025-03-01');
      });

      test('should handle YAML with single quotes', () => {
        const content = `---
document_number: '4.10'
document_name: 'Waste Management'
revision: '7'
---
Content`;

        const metadata = parser.extractMetadata(content, 'waste.md');

        expect(metadata.document_number).toBe('4.10');
        expect(metadata.document_name).toBe('Waste Management');
        expect(metadata.revision).toBe(7);
      });

      test('should handle YAML with missing optional fields', () => {
        const content = `---
document_number: 5.7
document_name: Basic Procedure
---
Content`;

        const metadata = parser.extractMetadata(content, '5.7-basic.md');

        expect(metadata.document_number).toBe('5.7');
        expect(metadata.document_name).toBe('Basic Procedure');
        expect(metadata.revision).toBe(1); // Default
        expect(metadata.summary).toBe('No summary available'); // Default
        expect(metadata.key_requirements).toEqual([]);
        expect(metadata.integration_points).toEqual([]);
      });

      test('should handle malformed YAML gracefully', () => {
        const content = `---
invalid yaml without colon
document_number: 5.7
---
Content`;

        const metadata = parser.extractMetadata(content, '5.7-malformed.md');

        expect(metadata.document_number).toBe('5.7');
      });
    });

    describe('Structured headers parsing', () => {
      test('should parse structured headers format', () => {
        const content = `## Document metadata
- **Document Number:** 3.9
- **Document Name:** Traceability
- **Revision:** 3
- **Effective Date:** 2025-04-01

## Summary
This procedure ensures product traceability.

## Key requirements
- Batch tracking
- Forward tracing
- Backward tracing

## Integration points
- Production records
- Shipping documents

Content follows`;

        const metadata = parser.extractMetadata(content, 'traceability.md');

        expect(metadata.document_number).toBe('3.9');
        expect(metadata.document_name).toBe('Traceability');
        expect(metadata.revision).toBe(3);
        expect(metadata.effective_date).toBe('2025-04-01');
        expect(metadata.summary).toContain('This procedure ensures product traceability');
        expect(metadata.key_requirements).toContain('Batch tracking');
        expect(metadata.integration_points).toContain('Production records');
      });

      test('should handle case-insensitive headers', () => {
        const content = `## document metadata
- **document_number:** 4.5
- **document_name:** Equipment Control
- **REVISION:** 8
- **effective_date:** 2025-05-01

Content`;

        const metadata = parser.extractMetadata(content, 'equipment.md');

        expect(metadata.document_number).toBe('4.5');
        expect(metadata.document_name).toBe('Equipment Control');
        expect(metadata.revision).toBe(8);
      });

      test('should extract multi-line summary and truncate to 500 chars', () => {
        const longSummary = 'A'.repeat(600);
        const content = `## Document metadata
- **Document Number:** 5.8

## Summary
${longSummary}

## Content`;

        const metadata = parser.extractMetadata(content, 'long.md');

        expect(metadata.summary.length).toBeLessThanOrEqual(500);
        expect(metadata.summary).toContain('A');
      });

      test('should handle missing metadata fields with fallbacks', () => {
        const content = `# Simple Document
Just content, no metadata.`;

        const metadata = parser.extractMetadata(content, '6.1-simple.md');

        expect(metadata.document_number).toBe('6.1'); // From filename
        expect(metadata.document_name).toBe('6.1-simple'); // From filename without .md
        expect(metadata.revision).toBe(1);
        expect(metadata.effective_date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Today's date
      });

      test('should limit key requirements to 10 items', () => {
        const content = `## Key requirements
- Requirement 1
- Requirement 2
- Requirement 3
- Requirement 4
- Requirement 5
- Requirement 6
- Requirement 7
- Requirement 8
- Requirement 9
- Requirement 10
- Requirement 11
- Requirement 12

Content`;

        const metadata = parser.extractMetadata(content, 'many-reqs.md');

        expect(metadata.key_requirements.length).toBe(10);
        expect(metadata.key_requirements[9]).toBe('Requirement 10');
      });

      test('should extract list items with various formats', () => {
        const content = `## Key requirements
- Item 1
* Item 2
  - Indented item 3
  * Indented item 4

## Integration points
- Integration 1
  - Sub-item (should be included)

Content`;

        const metadata = parser.extractMetadata(content, 'list.md');

        expect(metadata.key_requirements.length).toBeGreaterThan(0);
        expect(metadata.integration_points.length).toBeGreaterThan(0);
      });
    });

    describe('normalizeMetadata', () => {
      test('should use document_number from filename when not in metadata', () => {
        const content = `# No metadata
Content only`;

        const metadata = parser.extractMetadata(content, '7.3-audit.md');

        expect(metadata.document_number).toBe('7.3');
      });

      test('should handle filename without document number', () => {
        const content = `# No metadata`;

        const metadata = parser.extractMetadata(content, 'README.md');

        expect(metadata.document_number).toBe('UNKNOWN');
        expect(metadata.document_name).toBe('README');
      });

      test('should set document_type to procedure', () => {
        const content = `---
document_number: 5.7
---`;

        const metadata = parser.extractMetadata(content, 'test.md');

        expect(metadata.document_type).toBe('procedure');
      });

      test('should handle invalid revision number', () => {
        const content = `---
document_number: 5.7
revision: invalid
---`;

        const metadata = parser.extractMetadata(content, 'test.md');

        expect(metadata.revision).toBe(1); // Falls back to default via parseInt
      });

      test('should generate today date when effective_date missing', () => {
        const content = `---
document_number: 5.7
---`;

        const metadata = parser.extractMetadata(content, 'test.md');
        const today = new Date().toISOString().split('T')[0];

        expect(metadata.effective_date).toBe(today);
      });
    });
  });

  describe('extractContent', () => {
    test('should remove YAML frontmatter', () => {
      const markdown = `---
document_number: 5.7
document_name: Test
---

# Main Content
This is the actual procedure content.`;

      const content = parser.extractContent(markdown);

      expect(content).not.toContain('---');
      expect(content).not.toContain('document_number');
      expect(content).toContain('# Main Content');
      expect(content).toContain('This is the actual procedure content.');
    });

    test('should remove document metadata section', () => {
      const markdown = `## Document metadata
- **Document Number:** 5.7
- **Document Name:** Test

## Actual Content
This is the real content.`;

      const content = parser.extractContent(markdown);

      expect(content).not.toContain('## Document metadata');
      expect(content).toContain('## Actual Content');
    });

    test('should handle content with both YAML and metadata section', () => {
      const markdown = `---
document_number: 5.7
---

## Document metadata
- More metadata

## Real Content
Actual procedure here.`;

      const content = parser.extractContent(markdown);

      expect(content).not.toContain('---');
      expect(content).not.toContain('Document metadata');
      expect(content).toContain('## Real Content');
    });

    test('should trim whitespace', () => {
      const markdown = `---
document_number: 5.7
---


## Content
Text here.


`;

      const content = parser.extractContent(markdown);

      expect(content).toBe('## Content\nText here.');
      expect(content.startsWith(' ')).toBe(false);
      expect(content.endsWith(' ')).toBe(false);
    });

    test('should handle content with no frontmatter or metadata', () => {
      const markdown = `# Simple Content
Just text.`;

      const content = parser.extractContent(markdown);

      expect(content).toBe('# Simple Content\nJust text.');
    });

    test('should preserve markdown formatting', () => {
      const markdown = `---
meta: data
---

# Header 1
## Header 2

**Bold** and *italic*

- List item 1
- List item 2

\`\`\`javascript
code block
\`\`\``;

      const content = parser.extractContent(markdown);

      expect(content).toContain('# Header 1');
      expect(content).toContain('**Bold**');
      expect(content).toContain('- List item 1');
      expect(content).toContain('```javascript');
    });

    test('should handle empty content', () => {
      const markdown = `---
document_number: 5.7
---`;

      const content = parser.extractContent(markdown);

      expect(content).toBe('');
    });

    test('should handle content with multiple metadata-like sections', () => {
      const markdown = `## Document metadata
- Info

## Another Section
Content

## Document metadata (not first)
Should not be removed`;

      const content = parser.extractContent(markdown);

      // Only first metadata section should be removed
      expect(content).toContain('## Another Section');
      expect(content).toContain('## Document metadata (not first)');
    });
  });

  describe('edge cases', () => {
    test('should handle very large markdown files', async () => {
      const filePath = '/path/to/large.md';
      const largeContent = 'x'.repeat(100000);
      const markdown = `---
document_number: 5.7
---
${largeContent}`;

      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockResolvedValue(markdown);

      const result = await parser.parseFile(filePath);

      expect(result.content.length).toBeGreaterThan(50000);
    });

    test('should handle special characters in metadata', async () => {
      const filePath = '/path/to/special.md';
      const markdown = `---
document_number: 5.7
document_name: "Procedure with "quotes" & special chars <>"
summary: Line 1
Line 2 continued
---
Content`;

      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockResolvedValue(markdown);

      const result = await parser.parseFile(filePath);

      expect(result.metadata.document_name).toContain('quotes');
    });

    test('should handle unicode characters', async () => {
      const filePath = '/path/to/unicode.md';
      const markdown = `---
document_number: 5.7
document_name: Procédure Française 中文 العربية
---
Content with émojis 🎉 and symbols ✓`;

      mockFileReader.fileExists.mockResolvedValue(true);
      mockFileReader.readFile.mockResolvedValue(markdown);

      const result = await parser.parseFile(filePath);

      expect(result.metadata.document_name).toContain('Procédure');
      expect(result.content).toContain('émojis');
    });
  });
});
