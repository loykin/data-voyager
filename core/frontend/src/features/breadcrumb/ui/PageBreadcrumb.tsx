import { Link } from 'react-router-dom'
import { cn } from '@data-voyager/shared-ui/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@data-voyager/shared-ui/components/ui/breadcrumb'
import { useBreadcrumb } from '../model'

interface PageBreadcrumbProps {
  className?: string
  /** 마지막 항목 레이블 override (동적 제목, UUID 제거 등) */
  currentLabel?: string
}

/**
 * menuRegistry 기반 자동 breadcrumb.
 * trigger와의 겹침은 부모(AppLayout)의 flex row가 처리하므로
 * 이 컴포넌트는 순수 렌더링만 담당한다.
 */
export function PageBreadcrumb({ className, currentLabel }: PageBreadcrumbProps) {
  const crumbs = useBreadcrumb(currentLabel)

  if (crumbs.length === 0) return null

  return (
    <div className={cn('flex items-center min-w-0', className)}>
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => [
            index > 0 && <BreadcrumbSeparator key={`sep-${index}`} />,
            <BreadcrumbItem key={`${crumb.label}-${index}`}>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <span className="text-muted-foreground">{crumb.label}</span>
              )}
            </BreadcrumbItem>,
          ])}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
