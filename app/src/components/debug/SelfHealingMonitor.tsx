/**
 * Self-Healing Monitor Component
 *
 * Displays real-time metrics for self-healing system.
 * Shows circuit breaker status, retry stats, and error recovery metrics.
 */

import { useEffect, useState } from 'react';
import type { SelfHealingMetrics } from '../../services/mcp';
import { selfHealingSystem } from '../../utils/errorRecovery';

interface Props {
  /** MCP client with self-healing capabilities */
  mcpClient?: any; // SelfHealingMCPClient
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Show in compact mode */
  compact?: boolean;
}

export function SelfHealingMonitor({
  mcpClient,
  refreshInterval = 5000,
  compact = false,
}: Props): JSX.Element {
  const [metrics, setMetrics] = useState<SelfHealingMetrics | null>(null);
  const [recoveryStats, setRecoveryStats] = useState<any>(null);

  useEffect(() => {
    const updateMetrics = (): void => {
      if (mcpClient && typeof mcpClient.getMetrics === 'function') {
        setMetrics(mcpClient.getMetrics());
      }

      setRecoveryStats(selfHealingSystem.getStatistics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [mcpClient, refreshInterval]);

  if (!metrics && !recoveryStats) {
    return <div className="text-sm text-gray-500">No metrics available</div>;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs">
        {metrics && Object.keys(metrics.servers).map(server => {
          const stats = metrics.servers[server];
          const health = stats.successfulCalls / (stats.totalCalls || 1);

          return (
            <div key={server} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  health > 0.9
                    ? 'bg-green-500'
                    : health > 0.7
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {server}: {Math.round(health * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Self-Healing System Monitor
      </h3>

      {/* Global Stats */}
      {metrics && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Global Statistics
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Total Recoveries"
              value={metrics.global.totalRecoveries}
              color="blue"
            />
            <MetricCard
              label="Success Rate"
              value={
                metrics.global.totalRecoveries > 0
                  ? `${Math.round(
                      (metrics.global.successfulRecoveries /
                        metrics.global.totalRecoveries) *
                        100
                    )}%`
                  : 'N/A'
              }
              color={
                metrics.global.successfulRecoveries /
                  metrics.global.totalRecoveries >
                0.9
                  ? 'green'
                  : 'yellow'
              }
            />
            <MetricCard
              label="Uptime"
              value={formatUptime(metrics.global.uptime)}
              color="gray"
            />
          </div>
        </div>
      )}

      {/* Server Stats */}
      {metrics && Object.keys(metrics.servers).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Server Statistics
          </h4>
          <div className="space-y-4">
            {Object.entries(metrics.servers).map(([server, stats]) => (
              <ServerStats key={server} server={server} stats={stats} />
            ))}
          </div>
        </div>
      )}

      {/* Error Recovery Stats */}
      {recoveryStats && recoveryStats.total > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Error Recovery
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <MetricCard
              label="Errors Handled"
              value={recoveryStats.total}
              color="blue"
            />
            <MetricCard
              label="Recovery Rate"
              value={`${Math.round(
                (recoveryStats.successful / recoveryStats.total) * 100
              )}%`}
              color={
                recoveryStats.successful / recoveryStats.total > 0.8
                  ? 'green'
                  : 'yellow'
              }
            />
          </div>

          <div className="space-y-2">
            {Object.entries(recoveryStats.byAction || {}).map(
              ([action, count]) => (
                <div
                  key={action}
                  className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="capitalize">{action}:</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}): JSX.Element {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    yellow:
      'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
  };

  return (
    <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
      <div className="text-xs opacity-75 mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/**
 * Server Stats Component
 */
function ServerStats({
  server,
  stats,
}: {
  server: string;
  stats: any;
}): JSX.Element {
  const successRate = stats.totalCalls > 0
    ? (stats.successfulCalls / stats.totalCalls) * 100
    : 0;

  const statusColor =
    successRate > 90
      ? 'green'
      : successRate > 70
      ? 'yellow'
      : 'red';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-medium text-gray-900 dark:text-white capitalize">
          {server}
        </h5>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              statusColor === 'green'
                ? 'bg-green-500'
                : statusColor === 'yellow'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(successRate)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400">Calls</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {stats.totalCalls}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400">Retries</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {stats.retriesPerformed}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400">Cache Hits</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {stats.cacheHits}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Circuit Breaker:</span>
          <span className="font-medium">
            {stats.circuitOpenCount > 0
              ? `Opened ${stats.circuitOpenCount}x`
              : 'Closed'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Avg Response:</span>
          <span className="font-medium">{Math.round(stats.avgResponseTime)}ms</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
