"use client";

import React, { useState } from "react";
import { Badge } from "../ui/Badge";

interface Metric {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  context?: string;
  benchmark?: string;
}

interface MetricsGridData {
  title: string;
  subtitle?: string;
  metrics: Metric[];
  data_sources?: string[];
}

interface MetricsGridProps {
  data: MetricsGridData;
  ui_id: string;
}

export function MetricsGrid({ data, ui_id }: MetricsGridProps) {
  const [showSources, setShowSources] = useState(false);

  const getTrendIcon = (trend?: string) => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "";
  };

  const getTrendColor = (trend?: string) => {
    if (trend === "up") return "text-green-600 dark:text-green-400";
    if (trend === "down") return "text-red-600 dark:text-red-400";
    return "text-neutral-600 dark:text-neutral-400";
  };

  // Determine grid columns based on metric count
  const getGridCols = () => {
    const count = data.metrics.length;
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {data.title}
              </h3>
            </div>
            {data.subtitle && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                {data.subtitle}
              </p>
            )}
          </div>
          <Badge variant="default" size="sm">
            {data.metrics.length} metrics
          </Badge>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={`grid ${getGridCols()} gap-px bg-neutral-200 dark:bg-neutral-800 p-px`}>
        {data.metrics.map((metric, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-neutral-950 p-4 min-h-[100px] flex flex-col justify-between"
          >
            {/* Metric Label */}
            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">
              {metric.label}
            </div>

            {/* Metric Value */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                {metric.value}
              </div>

              {/* Change */}
              {metric.change && (
                <div className={`text-sm font-medium flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
                  <span>{getTrendIcon(metric.trend)}</span>
                  <span>{metric.change}</span>
                </div>
              )}

              {/* Context/Benchmark */}
              {(metric.context || metric.benchmark) && (
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {metric.context && <div>{metric.context}</div>}
                  {metric.benchmark && <div className="text-neutral-500 dark:text-neutral-500">{metric.benchmark}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with Data Sources */}
      {data.data_sources && data.data_sources.length > 0 && (
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors flex items-center gap-1"
          >
            <span>{showSources ? "▼" : "▶"}</span>
            <span>Data sources ({data.data_sources.length})</span>
          </button>
          
          {showSources && (
            <div className="mt-2 space-y-1">
              {data.data_sources.map((source, idx) => (
                <div
                  key={idx}
                  className="text-xs font-mono text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-950 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800"
                >
                  {source}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

