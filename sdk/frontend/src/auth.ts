// AuthContext — extension이 권한을 체크하는 인터페이스
export interface AuthContext {
  hasPermission(action: string, resource: string): boolean;
  currentUser: User | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}
