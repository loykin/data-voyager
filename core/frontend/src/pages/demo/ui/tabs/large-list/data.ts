export interface Resource {
  id: string
  name: string
  namespace: string
  status: 'Running' | 'Pending' | 'Failed' | 'Completed' | 'CrashLoopBackOff'
  description: string
  tags: string[]
  cpu: string
  memory: string
  restarts: number
  age: string
}

const NAMESPACES = ['default', 'kube-system', 'monitoring', 'ingress-nginx', 'cert-manager', 'data-platform', 'ml-serving']
const STATUSES: Resource['status'][] = ['Running', 'Running', 'Running', 'Pending', 'Failed', 'Completed', 'CrashLoopBackOff']

const TAG_POOL = [
  'production', 'staging', 'canary', 'v2', 'v3',
  'gpu', 'high-memory', 'spot-instance', 'on-demand',
  'team:infra', 'team:ml', 'team:data', 'team:backend', 'team:frontend',
  'app:api', 'app:worker', 'app:scheduler', 'app:gateway',
  'tier:critical', 'tier:standard', 'tier:batch',
  'region:us-east', 'region:eu-west', 'region:ap-south',
  'autoscale:enabled', 'debug:enabled', 'tracing:enabled',
]

const DESCRIPTIONS = [
  'Handles incoming HTTP traffic and routes requests to downstream microservices. Implements circuit breaker patterns and retries with exponential backoff.',
  'Processes batch jobs from the queue. Scales horizontally based on queue depth. Reports metrics to Prometheus every 15 seconds.',
  'Runs machine learning inference workloads using GPU acceleration. Loads models from object storage at startup. Caches results in Redis.',
  'Collects and aggregates logs from all pods in the namespace. Forwards structured JSON logs to the centralized logging pipeline.',
  'Manages database connection pooling and query routing. Supports read replicas with automatic failover. Monitors query performance.',
  'Executes scheduled data pipeline tasks. Coordinates with the orchestration engine to manage dependencies between tasks.',
  'Serves static assets and handles CDN cache invalidation. Configured with Brotli compression and HTTP/2 push.',
  'Monitors service health and triggers alerts based on SLO thresholds. Integrates with PagerDuty and Slack for incident management.',
  'Syncs configuration changes across the cluster using GitOps patterns. Reconciles desired state from the Git repository.',
  'Handles user authentication and token validation. Issues short-lived JWT tokens with role-based claims.',
]

function pick<T>(arr: T[], i: number): T {
  return arr[Math.abs(i) % arr.length]!
}

function makeTags(i: number): string[] {
  const count = 3 + (i % 6) // 3–8 tags
  const start = (i * 3) % TAG_POOL.length
  return Array.from({ length: count }, (_, j) => TAG_POOL[(start + j) % TAG_POOL.length]!)
}

function makeCpu(i: number): string {
  const values = ['50m', '125m', '250m', '500m', '1000m', '2000m', '4000m']
  return pick(values, i)
}

function makeMemory(i: number): string {
  const values = ['64Mi', '128Mi', '256Mi', '512Mi', '1Gi', '2Gi', '4Gi', '8Gi']
  return pick(values, i * 2 + 1)
}

function makeAge(i: number): string {
  const units = ['2m', '15m', '1h', '3h', '12h', '1d', '3d', '7d', '14d', '30d']
  return pick(units, i)
}

function makeRow(i: number): Resource {
  const ns = pick(NAMESPACES, i)
  const suffix = String(i).padStart(5, '0')
  return {
    id: `${ns}-pod-${suffix}`,
    name: `pod-${['api', 'worker', 'scheduler', 'gateway', 'inference', 'collector', 'sync'][i % 7]}-${suffix}`,
    namespace: ns,
    status: pick(STATUSES, i),
    description: pick(DESCRIPTIONS, i),
    tags: makeTags(i),
    cpu: makeCpu(i),
    memory: makeMemory(i),
    restarts: (i * 7) % 20,
    age: makeAge(i),
  }
}

export const RESOURCE_DATA: Resource[] = Array.from({ length: 300 }, (_, i) => makeRow(i))
