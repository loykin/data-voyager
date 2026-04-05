import type React from 'react'

/**
 * 사이드바에 등록할 메뉴 항목.
 * 각 feature의 menu.ts에서 직접 정의하고 menuRegistry에 등록한다.
 */
export interface MenuItem {
  /** 고유 식별자. 중복 등록 시 경고 후 덮어씀. */
  id: string
  /** 사이드바 표시 레이블 */
  label: string
  /** 클릭 시 이동할 경로. 없으면 non-navigable 그룹 헤더로 처리. */
  path?: string
  /**
   * 아이콘 — 등록하는 feature가 직접 lucide 등 React 노드로 전달.
   * @example icon: <Database className="h-4 w-4" />
   */
  icon?: React.ReactNode
  /** 사이드바 섹션 그룹 키 (예: 'data', 'system', 'dev') */
  group: string
  /** 그룹 표시명. 같은 group의 첫 번째 항목 값이 사용됨. */
  groupLabel?: string
  /** 그룹 자체 정렬 순서. 낮을수록 위에 위치. (기본값: 100) */
  groupOrder?: number
  /** 그룹 내 항목 정렬 순서. 낮을수록 위에 위치. (기본값: 100) */
  order?: number
  /** 서브메뉴 항목 */
  children?: ChildMenuItem[]
}

/** 서브메뉴 항목 (그룹·정렬 정보 없음) */
export interface ChildMenuItem {
  id: string
  label: string
  path: string
  icon?: React.ReactNode
  order?: number
}

/** getSections()가 반환하는 렌더링용 섹션 */
export interface MenuSection {
  group: string
  label: string
  items: MenuItem[]
}
