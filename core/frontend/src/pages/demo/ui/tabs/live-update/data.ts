export interface Pod {
  id: string
  name: string
  namespace: string
  status: 'Running' | 'Pending' | 'Failed' | 'CrashLoopBackOff' | 'Terminating'
  cpu: number   // millicores
  memory: number // MiB
  restarts: number
  node: string
  age: string
}

const NAMESPACES = ['default', 'kube-system', 'monitoring', 'data-platform', 'ml-serving']
const NODES = ['node-01', 'node-02', 'node-03', 'node-04', 'node-05']
const WORKLOADS = ['api', 'worker', 'scheduler', 'gateway', 'inference', 'collector', 'syncer', 'proxy']
const STATUSES: Pod['status'][] = ['Running', 'Running', 'Running', 'Running', 'Pending', 'Failed', 'CrashLoopBackOff', 'Terminating']

function pick<T>(arr: T[], i: number): T {
  return arr[Math.abs(i) % arr.length]!
}

export function generatePods(count = 120): Pod[] {
  return Array.from({ length: count }, (_, i) => {
    const workload = pick(WORKLOADS, i)
    const ns = pick(NAMESPACES, i)
    return {
      id: `pod-${workload}-${String(i).padStart(4, '0')}`,
      name: `${workload}-${String(i).padStart(4, '0')}-${Math.random().toString(36).slice(2, 7)}`,
      namespace: ns,
      status: pick(STATUSES, i),
      cpu: 50 + ((i * 37) % 900),
      memory: 64 + ((i * 53) % 3968),
      restarts: (i * 7) % 15,
      node: pick(NODES, i),
      age: `${1 + (i % 29)}d`,
    }
  })
}

/**
 * Simulate a k8s list-watch tick: update a random subset of pods.
 * - Status changes (crash loops, restarts)
 * - CPU/memory fluctuations
 * - Occasional pod replacement (new name suffix = new pod)
 */
export function tickPods(pods: Pod[]): Pod[] {
  return pods.map((pod) => {
    if (Math.random() > 0.15) return pod  // 85% unchanged
    const roll = Math.random()
    if (roll < 0.3) {
      // CPU/memory fluctuation
      return {
        ...pod,
        cpu: Math.max(10, pod.cpu + Math.floor((Math.random() - 0.5) * 200)),
        memory: Math.max(32, pod.memory + Math.floor((Math.random() - 0.5) * 512)),
      }
    } else if (roll < 0.55) {
      // Status change
      const next: Pod['status'][] = pod.status === 'Running'
        ? ['Running', 'Running', 'Pending', 'CrashLoopBackOff']
        : ['Running', 'Running', 'Running', pod.status]
      return { ...pod, status: next[Math.floor(Math.random() * next.length)]! }
    } else if (roll < 0.75) {
      // Restart increment
      return { ...pod, restarts: pod.restarts + 1, status: 'Running' }
    } else {
      // Pod replaced (new suffix, reset counters)
      return {
        ...pod,
        name: `${pod.name.split('-').slice(0, -1).join('-')}-${Math.random().toString(36).slice(2, 7)}`,
        restarts: 0,
        status: 'Running',
        cpu: 50 + Math.floor(Math.random() * 200),
        memory: 128 + Math.floor(Math.random() * 512),
      }
    }
  })
}
