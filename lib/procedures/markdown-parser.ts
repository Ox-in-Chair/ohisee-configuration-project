/**
 * Markdown Parser Service
 * Parses Kangopak markdown procedure files and extracts metadata
 *
 * Architecture:
 * - File reading injected via IFileReader interface
 * - No static file system calls
 * - Handles both YAML frontmatter and structured markdown headers
 */

import type {
  ProcedureMetadata,
  ParsedProcedure,
  IFileReader,
  ILogger
} from './types';

/**
 * Markdown Parser Interface
 */
export interface IMarkdownParser {
  parseFile(filePath: string): Promise<ParsedProcedure>;
  extractMetadata(content: string, fileName: string): ProcedureMetadata;
  extractContent(markdown: string): string;
}

/**
 * Markdown Parser Implementation
 */
export class MarkdownParser implements IMarkdownParser {
  constructor(
    private fileReader: IFileReader,
    private logger: ILogger
  ) {
    this.logger.info('MarkdownParser initialized');
  }

  /**
   * Parse a markdown file and extract metadata + content
   *
   * @param filePath Path to markdown file
   * @returns Parsed procedure with metadata and content
   */
  async parseFile(filePath: string): Promise<ParsedProcedure> {
    this.logger.info(`Parsing file: ${filePath}`);

    // Check file exists (using injected file reader)
    const exists = await this.fileReader.fileExists(filePath);
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read file content (using injected file reader)
    const markdown = await this.fileReader.readFile(filePath, 'utf-8');

    // Extract filename for fallback document number
    const fileName = filePath.split(/[/\\]/).pop() || '';

    // Extract metadata from markdown
    const metadata = this.extractMetadata(markdown, fileName);

    // Extract content (strip frontmatter and metadata sections)
    const content = this.extractContent(markdown);

    this.logger.info(`✓ Parsed ${metadata.document_number}: ${metadata.document_name}`);

    return {
      metadata,
      content,
      filePath
    };
  }

  /**
   * Extract metadata from markdown content
   *
   * Supports two formats:
   * 1. YAML frontmatter (---  metadata  ---)
   * 2. Structured headers (## Document metadata)
   *
   * @param content Markdown content
   * @param fileName File name for fallback document number
   * @returns Procedure metadata
   */
  extractMetadata(content: string, fileName: string): ProcedureMetadata {
    // Try YAML frontmatter first
    const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (yamlMatch) {
      return this.parseYAMLFrontmatter(yamlMatch[1], fileName);
    }

    // Fall back to structured headers
    return this.parseStructuredHeaders(content, fileName);
  }

  /**
   * Parse YAML frontmatter
   */
  private parseYAMLFrontmatter(yaml: string, fileName: string): ProcedureMetadata {
    const lines = yaml.split('\n');
    const metadata: any = {};

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }

        metadata[key] = value;
      }
    }

    return this.normalizeMetadata(metadata, fileName);
  }

  /**
   * Parse structured markdown headers
   *
   * Example format:
   * ## Document metadata
   * - **Document Number:** 5.7
   * - **Document Name:** Control of Non-Conforming Product
   */
  private parseStructuredHeaders(content: string, fileName: string): ProcedureMetadata {
    const metadata: any = {};

    // Extract document number
    const docNumMatch = content.match(/(?:Document Number|document_number):\s*\**([0-9.]+)/i);
    if (docNumMatch) {
      metadata.document_number = docNumMatch[1];
    }

    // Extract document name
    const docNameMatch = content.match(/(?:Document Name|document_name):\s*\**([^\n*]+)/i);
    if (docNameMatch) {
      metadata.document_name = docNameMatch[1].trim();
    }

    // Extract revision
    const revMatch = content.match(/(?:Revision|revision):\s*\**([0-9]+)/i);
    if (revMatch) {
      metadata.revision = parseInt(revMatch[1], 10);
    }

    // Extract effective date
    const dateMatch = content.match(/(?:Effective Date|effective_date|date):\s*\**([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    if (dateMatch) {
      metadata.effective_date = dateMatch[1];
    }

    // Extract summary
    const summaryMatch = content.match(/##\s*Summary\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
    if (summaryMatch) {
      metadata.summary = summaryMatch[1].trim().replace(/\n+/g, ' ').slice(0, 500);
    }

    // Extract key requirements
    const reqMatch = content.match(/##\s*Key requirements?\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
    if (reqMatch) {
      metadata.key_requirements = this.extractListItems(reqMatch[1]);
    }

    // Extract integration points
    const intMatch = content.match(/##\s*Integration points?\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
    if (intMatch) {
      metadata.integration_points = this.extractListItems(intMatch[1]);
    }

    return this.normalizeMetadata(metadata, fileName);
  }

  /**
   * Extract list items from markdown list
   */
  private extractListItems(text: string): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(/^[\s-*]*(.+)$/);
      if (match && match[1].trim()) {
        items.push(match[1].trim());
      }
    }

    return items.slice(0, 10); // Limit to 10 items
  }

  /**
   * Normalize metadata to expected format
   */
  private normalizeMetadata(raw: any, fileName: string): ProcedureMetadata {
    // Extract document number from filename if not in metadata
    const docNumberFromFile = fileName.match(/^([0-9.]+)/)?.[1];

    return {
      document_number: raw.document_number || docNumberFromFile || 'UNKNOWN',
      document_name: raw.document_name || raw.name || fileName.replace(/\.md$/, ''),
      document_type: 'procedure',
      revision: parseInt(raw.revision || '1', 10),
      effective_date: raw.effective_date || raw.date || new Date().toISOString().split('T')[0],
      summary: raw.summary || 'No summary available',
      key_requirements: raw.key_requirements || [],
      integration_points: raw.integration_points || [],
      form_sections: raw.form_sections || []
    };
  }

  /**
   * Extract content from markdown (strip frontmatter and metadata)
   */
  extractContent(markdown: string): string {
    let content = markdown;

    // Remove YAML frontmatter
    content = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

    // Remove metadata section if present
    content = content.replace(/##\s*Document metadata[\s\S]*?(?=\n##)/i, '');

    // Trim whitespace
    content = content.trim();

    return content;
  }
}
