import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { InsightBubble } from '../agent/InsightBubble';

interface FilingExtractCardProps {
  toolCall?: {
    tool_id: string;
    cli_tool: string;
    metadata?: {
      mode?: string;
      sections?: string[];
      keywords?: string[];
      pattern?: string;
      filing_path?: string;
    };
  };
  result?: {
    ok: boolean;
    result?: Record<string, string | null>;
    paths?: string[];
    error?: string;
  };
  isLoading?: boolean;
}

export function FilingExtractCard({ toolCall, result, isLoading }: FilingExtractCardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const metadata = toolCall?.metadata || {};

  const mode = metadata.mode || 'extract_sections';
  
  // Mode display
  const getModeDisplay = () => {
    switch (mode) {
      case 'extract_sections':
        return { icon: '📑', label: 'Section Extraction', color: 'blue' };
      case 'search_keywords':
        return { icon: '🔍', label: 'Keyword Search', color: 'green' };
      case 'search_regex':
        return { icon: '🔎', label: 'Pattern Search', color: 'purple' };
      default:
        return { icon: '📄', label: 'Filing Extract', color: 'gray' };
    }
  };

  const modeDisplay = getModeDisplay();

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Section name formatting
  const formatSectionName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get filing name from path
  const getFilingName = () => {
    if (!metadata.filing_path) return 'SEC Filing';
    const parts = metadata.filing_path.split('/');
    // Try to extract ticker and form type from path
    const ticker = parts.find(p => /^[A-Z]{1,5}$/.test(p)) || '';
    const form = parts.find(p => /^10-[KQ]$/i.test(p)) || parts.find(p => /^8-K$/i.test(p)) || '';
    return ticker && form ? `${ticker} ${form.toUpperCase()}` : 'SEC Filing';
  };

  return (
    <div className="filing-extract-card border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {modeDisplay.icon} {modeDisplay.label}
            </h3>
            <Badge variant={modeDisplay.color as any}>
              {mode.replace('_', ' ')}
            </Badge>
            {isLoading && (
              <span className="text-xs text-gray-500 animate-pulse">Extracting...</span>
            )}
          </div>
          
          {/* Filing Info */}
          <div className="text-xs text-gray-600">
            {getFilingName()}
          </div>
        </div>
      </div>

      {/* Mode-specific parameters */}
      {!isLoading && metadata && (
        <div className="mb-3">
          {mode === 'extract_sections' && metadata.sections && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-600">Sections:</span>
              {metadata.sections.map(section => (
                <Badge key={section} variant="secondary" size="sm">
                  {formatSectionName(section)}
                </Badge>
              ))}
            </div>
          )}
          
          {mode === 'search_keywords' && metadata.keywords && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-600">Keywords:</span>
              {metadata.keywords.map((keyword, idx) => (
                <Badge key={idx} variant="success" size="sm">
                  "{keyword}"
                </Badge>
              ))}
            </div>
          )}
          
          {mode === 'search_regex' && metadata.pattern && (
            <div className="bg-purple-50 rounded p-2 border border-purple-200">
              <span className="text-xs font-medium text-purple-800">Pattern:</span>
              <code className="text-xs text-purple-900 ml-2 font-mono">{metadata.pattern}</code>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">
            {mode === 'extract_sections' 
              ? `Extracting ${metadata.sections?.length || 0} sections...`
              : mode === 'search_keywords'
              ? `Searching for ${metadata.keywords?.length || 0} keywords...`
              : 'Processing pattern match...'}
          </span>
        </div>
      )}

      {/* Result */}
      {!isLoading && result && (
        <>
          {result.ok ? (
            <div className="space-y-3">
              {/* Insight */}
              {mode === 'extract_sections' && result.result && (
                <InsightBubble
                  insight={`Extracted ${Object.keys(result.result).length} sections from filing`}
                  variant="success"
                />
              )}
              
              {mode === 'search_keywords' && result.result && (
                <InsightBubble
                  insight={`Found matches for ${metadata.keywords?.length || 0} keyword(s)`}
                  variant="success"
                />
              )}
              
              {mode === 'search_regex' && result.result && (
                <InsightBubble
                  insight={`Found ${(result.result as any).match_count || 0} pattern matches`}
                  variant="success"
                />
              )}

              {/* Extracted Sections Display */}
              {mode === 'extract_sections' && result.result && (
                <div className="space-y-2">
                  {Object.entries(result.result).map(([section, path]) => (
                    <div 
                      key={section}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => path && toggleSection(section)}
                        disabled={!path}
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                          path 
                            ? 'hover:bg-gray-50 cursor-pointer' 
                            : 'bg-gray-100 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatSectionName(section)}
                          </span>
                          {!path && (
                            <Badge variant="secondary" size="sm">Not Found</Badge>
                          )}
                        </div>
                        {path && (
                          <span className="text-xs text-gray-500">
                            {expandedSections.has(section) ? '▼' : '▶'}
                          </span>
                        )}
                      </button>
                      
                      {expandedSections.has(section) && path && (
                        <div className="p-3 bg-gray-50 border-t border-gray-200">
                          <div className="text-xs text-gray-600 mb-1">Saved to:</div>
                          <Tooltip content={path}>
                            <div className="text-xs font-mono text-blue-700 truncate">
                              {path.split('/').slice(-3).join('/')}
                            </div>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Search Results Display */}
              {(mode === 'search_keywords' || mode === 'search_regex') && result.result && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    {mode === 'search_keywords' 
                      ? `Keywords: ${metadata.keywords?.join(', ')}`
                      : `Pattern: ${metadata.pattern}`}
                  </div>
                  {(result.result as any).match_count !== undefined && (
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                      {(result.result as any).match_count} matches found
                    </div>
                  )}
                  <div className="text-xs text-gray-600 mb-1">Results saved to:</div>
                  {result.paths?.map((path, idx) => (
                    <Tooltip key={idx} content={path}>
                      <div className="text-xs font-mono text-blue-700 truncate">
                        {path.split('/').slice(-3).join('/')}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* All Saved Paths */}
              {result.paths && result.paths.length > 0 && (
                <div className="bg-blue-50 rounded p-2 border border-blue-200">
                  <div className="text-xs font-medium text-blue-800">
                    💾 {result.paths.length} file(s) saved
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="text-sm font-medium text-red-800 mb-1">❌ Extraction Failed</div>
              <div className="text-xs text-red-700">{result.error}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

