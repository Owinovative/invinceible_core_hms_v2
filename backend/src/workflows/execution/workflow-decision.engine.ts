import { Injectable, Logger } from '@nestjs/common';

/**
 * WorkflowDecisionEngine — Secure Expression Evaluator
 *
 * Evaluates workflow transition conditions using a custom tokenizer + recursive-descent parser.
 * NO eval(), NO new Function(), NO vm module.
 *
 * Supported syntax:
 *   - Comparisons: ==, !=, <, >, <=, >=
 *   - Logical operators: &&, ||
 *   - Boolean literals: true, false
 *   - Numeric literals: 42, 3.14
 *   - String literals: 'URGENT', "EMERGENCY"
 *   - Property access on whitelisted namespaces: context.patient.age, or flat keys: age, hasPrescription
 *   - Parentheses for grouping
 *
 * Whitelisted top-level namespaces: patient, encounter, triage, facility, workflow, variables
 * All other root-level keys from flat context are also allowed for backward compatibility.
 */

// ─── Token Types ────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENTIFIER'
  | 'DOT'
  | 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'AND' | 'OR'
  | 'LPAREN' | 'RPAREN'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  raw: string;
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    // Skip whitespace
    if (/\s/.test(expression[i])) { i++; continue; }

    // String literals
    if (expression[i] === '"' || expression[i] === "'") {
      const quote = expression[i++];
      let str = '';
      while (i < expression.length && expression[i] !== quote) {
        str += expression[i++];
      }
      i++; // closing quote
      tokens.push({ type: 'STRING', value: str, raw: str });
      continue;
    }

    // Numeric literals
    if (/[0-9]/.test(expression[i]) || (expression[i] === '-' && /[0-9]/.test(expression[i + 1] ?? ''))) {
      let num = '';
      if (expression[i] === '-') num += expression[i++];
      while (i < expression.length && /[0-9.]/.test(expression[i])) num += expression[i++];
      tokens.push({ type: 'NUMBER', value: parseFloat(num), raw: num });
      continue;
    }

    // Two-character operators
    const two = expression.slice(i, i + 2);
    if (two === '==') { tokens.push({ type: 'EQ',  value: '==', raw: two }); i += 2; continue; }
    if (two === '!=') { tokens.push({ type: 'NEQ', value: '!=', raw: two }); i += 2; continue; }
    if (two === '<=') { tokens.push({ type: 'LTE', value: '<=', raw: two }); i += 2; continue; }
    if (two === '>=') { tokens.push({ type: 'GTE', value: '>=', raw: two }); i += 2; continue; }
    if (two === '&&') { tokens.push({ type: 'AND', value: '&&', raw: two }); i += 2; continue; }
    if (two === '||') { tokens.push({ type: 'OR',  value: '||', raw: two }); i += 2; continue; }

    // Single-character operators
    if (expression[i] === '<') { tokens.push({ type: 'LT',     value: '<', raw: '<' }); i++; continue; }
    if (expression[i] === '>') { tokens.push({ type: 'GT',     value: '>', raw: '>' }); i++; continue; }
    if (expression[i] === '(') { tokens.push({ type: 'LPAREN', value: '(', raw: '(' }); i++; continue; }
    if (expression[i] === ')') { tokens.push({ type: 'RPAREN', value: ')', raw: ')' }); i++; continue; }
    if (expression[i] === '.') { tokens.push({ type: 'DOT',    value: '.', raw: '.' }); i++; continue; }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(expression[i])) {
      let ident = '';
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) ident += expression[i++];
      if (ident === 'true')  { tokens.push({ type: 'BOOLEAN', value: true,  raw: ident }); continue; }
      if (ident === 'false') { tokens.push({ type: 'BOOLEAN', value: false, raw: ident }); continue; }
      if (ident === 'null')  { tokens.push({ type: 'NULL',    value: null,  raw: ident }); continue; }
      tokens.push({ type: 'IDENTIFIER', value: ident, raw: ident });
      continue;
    }

    throw new Error(`Unexpected character '${expression[i]}' in expression`);
  }

  tokens.push({ type: 'EOF', value: null, raw: '' });
  return tokens;
}

// ─── Parser (Recursive Descent) ──────────────────────────────────────────────

const WHITELISTED_NAMESPACES = new Set(['patient', 'encounter', 'triage', 'facility', 'workflow', 'variables']);

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private expect(type: TokenType): Token {
    const t = this.consume();
    if (t.type !== type) throw new Error(`Expected ${type} but got ${t.type} ('${t.raw}')`);
    return t;
  }

  parse(): (ctx: Record<string, any>) => boolean {
    const expr = this.parseOr();
    if (this.peek().type !== 'EOF') throw new Error(`Unexpected token '${this.peek().raw}' after expression`);
    return expr;
  }

  private parseOr(): (ctx: Record<string, any>) => boolean {
    let left = this.parseAnd();
    while (this.peek().type === 'OR') {
      this.consume();
      const right = this.parseAnd();
      const prevLeft = left;
      left = (ctx) => prevLeft(ctx) || right(ctx);
    }
    return left;
  }

  private parseAnd(): (ctx: Record<string, any>) => boolean {
    let left = this.parseComparison();
    while (this.peek().type === 'AND') {
      this.consume();
      const right = this.parseComparison();
      const prevLeft = left;
      left = (ctx) => prevLeft(ctx) && right(ctx);
    }
    return left;
  }

  private parseComparison(): (ctx: Record<string, any>) => boolean {
    if (this.peek().type === 'LPAREN') {
      this.consume();
      const inner = this.parseOr();
      this.expect('RPAREN');
      return inner;
    }

    const left = this.parsePrimary();
    const opToken = this.peek();
    if (!['EQ', 'NEQ', 'LT', 'GT', 'LTE', 'GTE'].includes(opToken.type)) {
      // Treat as truthy check
      return (ctx) => !!left(ctx);
    }
    this.consume();
    const right = this.parsePrimary();

    switch (opToken.type) {
      case 'EQ':  return (ctx) => left(ctx) == right(ctx);  // intentional ==
      case 'NEQ': return (ctx) => left(ctx) != right(ctx);
      case 'LT':  return (ctx) => (left(ctx) as number) < (right(ctx) as number);
      case 'GT':  return (ctx) => (left(ctx) as number) > (right(ctx) as number);
      case 'LTE': return (ctx) => (left(ctx) as number) <= (right(ctx) as number);
      case 'GTE': return (ctx) => (left(ctx) as number) >= (right(ctx) as number);
      default:    return () => false;
    }
  }

  private parsePrimary(): (ctx: Record<string, any>) => any {
    const t = this.peek();

    if (t.type === 'NUMBER')  { this.consume(); return () => t.value; }
    if (t.type === 'STRING')  { this.consume(); return () => t.value; }
    if (t.type === 'BOOLEAN') { this.consume(); return () => t.value; }
    if (t.type === 'NULL')    { this.consume(); return () => null; }

    if (t.type === 'IDENTIFIER') {
      // Collect dot-separated path (e.g. patient.age or just hasPrescription)
      const parts: string[] = [t.raw];
      this.consume();
      while (this.peek().type === 'DOT') {
        this.consume();
        const next = this.expect('IDENTIFIER');
        parts.push(next.raw as string);
      }

      // Security check: if it starts with a dotted namespace, enforce whitelist
      if (parts.length > 1 && !WHITELISTED_NAMESPACES.has(parts[0])) {
        throw new Error(`Unauthorized namespace '${parts[0]}' in expression. Allowed: ${[...WHITELISTED_NAMESPACES].join(', ')}`);
      }

      return (ctx: Record<string, any>) => {
        let current: any = ctx;
        for (const part of parts) {
          if (current == null || typeof current !== 'object') return null;
          current = current[part];
        }
        return current ?? null;
      };
    }

    if (t.type === 'LPAREN') {
      this.consume();
      const inner = this.parseOr();
      this.expect('RPAREN');
      return inner;
    }

    throw new Error(`Unexpected token '${t.raw}' (${t.type})`);
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface AuditedEvaluation {
  result: boolean;
  expression: string;
  resolvedValues: Record<string, any>;
}

@Injectable()
export class WorkflowDecisionEngine {
  private readonly logger = new Logger(WorkflowDecisionEngine.name);

  /**
   * Evaluates a condition expression securely against the provided flat context.
   * Returns true for empty/null conditions (unconditional transition).
   */
  evaluateCondition(condition: string, context: Record<string, any>): boolean {
    if (!condition || condition.trim() === '') return true;

    try {
      const fn = new Parser(tokenize(condition)).parse();
      return fn(context);
    } catch (error: any) {
      this.logger.error(
        `[DecisionEngine] Failed to evaluate: "${condition}" | Context keys: [${Object.keys(context).join(', ')}] | Error: ${error.message}`,
      );
      return false; // Fail-safe: do not advance workflow on evaluation error
    }
  }

  /**
   * Evaluates a condition and returns full audit metadata.
   * Used to populate WorkflowAudit.metadata with decisionExpression and decisionResult.
   */
  evaluateConditionWithAudit(condition: string, context: Record<string, any>): AuditedEvaluation {
    const result = this.evaluateCondition(condition, context);

    // Capture the top-level keys that were referenced in the condition
    const resolvedValues: Record<string, any> = {};
    for (const key of Object.keys(context)) {
      if (condition.includes(key)) {
        resolvedValues[key] = context[key];
      }
    }

    return { result, expression: condition, resolvedValues };
  }

  /**
   * Evaluates variable mappings to build the runtime context for the instance.
   * e.g., mapping={ age: "patient.age" }, sourceData={ patient: { age: 30 } }
   */
  buildContext(mappings: Record<string, string>, sourceData: Record<string, any>): Record<string, any> {
    const context: Record<string, any> = {};
    for (const [key, path] of Object.entries(mappings)) {
      context[key] = this.resolvePath(sourceData, path);
    }
    return context;
  }

  private resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : null, obj);
  }
}
