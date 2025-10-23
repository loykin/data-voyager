# @data-voyager/shared-ui

Shared UI component library for Data Voyager applications.

## Overview

This package contains reusable UI components built with:
- **shadcn/ui** - High-quality, accessible components
- **Radix UI** - Unstyled, accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type safety

## Components

All components are located in `src/components/ui/`:

- `alert` - Alert dialogs
- `badge` - Badge components
- `button` - Button component
- `card` - Card component
- `checkbox` - Checkbox component
- `dialog` - Dialog/Modal component
- `dropdown-menu` - Dropdown menu component
- `form` - Form components
- `input` - Input component
- `label` - Label component
- `select` - Select dropdown component
- `sidebar` - Sidebar navigation component
- `switch` - Toggle switch component
- `table` - Table component
- `tabs` - Tab component
- `textarea` - Textarea component

## Usage

### Installation

This package is part of the Data Voyager monorepo and is automatically linked via pnpm workspace.

In `core/frontend/package.json`:

```json
{
  "dependencies": {
    "@data-voyager/shared-ui": "workspace:*"
  }
}
```

### Importing Components

```typescript
// Import specific components
import { Button } from "@data-voyager/shared-ui/components/ui/button";
import { Card, CardContent, CardHeader } from "@data-voyager/shared-ui/components/ui/card";

// Import utilities
import { cn } from "@data-voyager/shared-ui/lib/utils";
```

### Using Components

```tsx
import { Button } from "@data-voyager/shared-ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@data-voyager/shared-ui/components/ui/card";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

## Development

### Adding New Components

1. Create the component in `src/components/ui/`
2. Export it from `src/index.ts`
3. Document it in this README

### Styling

Components use Tailwind CSS classes and the `cn()` utility for conditional class merging:

```tsx
import { cn } from "@data-voyager/shared-ui/lib/utils";

<div className={cn("base-classes", condition && "conditional-classes")} />
```

## TypeScript

All components are fully typed with TypeScript. Use the provided type definitions:

```typescript
import type { ButtonProps } from "@data-voyager/shared-ui/components/ui/button";
```

## License

MIT
