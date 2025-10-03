import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { InsightBubble } from '../agent/InsightBubble';

interface QACardProps {
  toolCall?: {
    tool_id: string;
    cli_tool: string;
    metadata?: {
      instruction?: string;
      model?: string;
      document_paths?: string[];
      output_schema?: any;
    };
  };
  result?: {
    ok: boolean;
    result?: any;
    paths?: string[];
    metrics?: {
      chunks?: number;
      t_ms?: number;
      bytes?: number;
      input_tokens?: number;
      output_tokens?: number;
      cost_usd?: number;
    };
    error?: string;
  };
  isLoading?: boolean;
}

export function QACard({ toolCall, result, isLoading }: QACardProps) {
  const [expanded, setExpanded] = useState(false);
  const metadata = toolCall?.metadata || {};
  const metrics = result?.metrics || {};

  // Determine if output is structured or unstructured
  const isStructured = metadata.output_schema !== undefined;
  const answer = result?.result;

  // Cost badge color
  const getCostColor = (cost: number | undefined) => {
    if (!cost) return 'gray';
    if (cost < 0.10) return 'green';
    if (cost < 0.50) return 'yellow';
    return 'orange';
  };

  // Model badge
  const model = metadata.model || 'claude-3-5-sonnet-latest';
  const modelShort = model.includes('haiku') ? 'Haiku' : 'Sonnet';

  return (
    <div className="qa-card border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">📄 Document Q&A</h3>
            <Badge variant={modelShort === 'Haiku' ? 'success' : 'info'}>
              {modelShort}
            </Badge>
            {isLoading && (
              <span className="text-xs text-gray-500 animate-pulse">Processing...</span>
            )}
          </div>
          
          {/* Instruction */}
          {metadata.instruction && (
            <div className="text-sm text-gray-700 italic mb-2">
              "{metadata.instruction.substring(0, 120)}
              {metadata.instruction.length > 120 ? '...' : ''}"
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">
            Analyzing {metadata.document_paths?.length || 1} document(s)...
          </span>
        </div>
      )}

      {/* Result */}
      {!isLoading && result && (
        <>
          {result.ok ? (
            <div className="space-y-3">
              {/* Insight Summary */}
              {metrics.chunks && (
                <InsightBubble
                  insight={`Analyzed ${metrics.chunks} chunk(s) from ${
                    Math.round((metrics.bytes || 0) / 1024)
                  }KB of text using ${modelShort}`}
                  variant="info"
                />
              )}

              {/* Answer Display */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                {isStructured ? (
                  // Structured JSON output
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Structured Output</span>
                      <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {expanded ? 'Collapse' : 'Expand'}
                      </button>
                    </div>
                    {expanded ? (
                      <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(answer, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-sm text-gray-700">
                        {/* Show key-value pairs for structured data */}
                        {typeof answer === 'object' && answer !== null ? (
                          <div className="space-y-1">
                            {Object.entries(answer).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium text-gray-600">{key}:</span>
                                <span className="text-gray-800">
                                  {typeof value === 'object' 
                                    ? `${Array.isArray(value) ? value.length : Object.keys(value).length} items`
                                    : String(value).substring(0, 80)}
                                </span>
                              </div>
                            ))}
                            {Object.keys(answer).length > 3 && (
                              <div className="text-xs text-gray-500 italic">
                                +{Object.keys(answer).length - 3} more fields
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>{String(answer)}</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Unstructured text/markdown output
                  <div className="prose prose-sm max-w-none">
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                      {expanded ? answer : String(answer).substring(0, 300)}
                      {String(answer).length > 300 && !expanded && '...'}
                    </div>
                    {String(answer).length > 300 && (
                      <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                      >
                        {expanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Saved Files */}
              {result.paths && result.paths.length > 0 && (
                <div className="bg-blue-50 rounded p-2 border border-blue-200">
                  <div className="text-xs font-medium text-blue-800 mb-1">
                    💾 Saved {result.paths.length} file(s)
                  </div>
                  {result.paths.map((path, idx) => (
                    <Tooltip key={idx} content={path}>
                      <div className="text-xs text-blue-700 truncate font-mono">
                        {path.split('/').slice(-2).join('/')}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* Metrics Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {metrics.t_ms && (
                    <Tooltip content="Processing time">
                      <span>⏱️ {(metrics.t_ms / 1000).toFixed(1)}s</span>
                    </Tooltip>
                  )}
                  {metrics.input_tokens && (
                    <Tooltip content="Input tokens">
                      <span>📥 {metrics.input_tokens.toLocaleString()}</span>
                    </Tooltip>
                  )}
                  {metrics.output_tokens && (
                    <Tooltip content="Output tokens">
                      <span>📤 {metrics.output_tokens.toLocaleString()}</span>
                    </Tooltip>
                  )}
                </div>
                {metrics.cost_usd !== undefined && (
                  <Badge variant={getCostColor(metrics.cost_usd)}>
                    ${metrics.cost_usd.toFixed(4)}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="text-sm font-medium text-red-800 mb-1">❌ Analysis Failed</div>
              <div className="text-xs text-red-700">{result.error}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

