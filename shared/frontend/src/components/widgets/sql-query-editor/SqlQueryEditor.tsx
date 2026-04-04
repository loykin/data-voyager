import { useEffect, useRef, useCallback } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { sql, type SQLDialect } from '@codemirror/lang-sql';

export interface SqlQueryEditorProps {
  /** Current SQL query string */
  value: string;
  onChange: (value: string) => void;
  /** Called when user presses Mod+Enter */
  onRun?: () => void;
  dialect?: SQLDialect;
  /** Additional class applied to the outer container */
  className?: string;
  readOnly?: boolean;
}

const editorBaseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  '.cm-content': { padding: '8px 0' },
  '.cm-line': { padding: '0 12px' },
  '.cm-focused': { outline: 'none' },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--muted))',
    borderRight: '1px solid hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-activeLine': { backgroundColor: 'hsl(var(--muted)/0.4)' },
  '.cm-activeLineGutter': { backgroundColor: 'hsl(var(--muted)/0.6)' },
});

/**
 * Base SQL editor built on CodeMirror 6.
 * Designed to be composed by datasource extension plugins — each extension
 * wraps this with its own dialect and schema completions, then registers
 * the wrapper as DatasourcePlugin.queryEditorComponent.
 */
export function SqlQueryEditor({
  value,
  onChange,
  onRun,
  dialect,
  className,
  readOnly = false,
}: SqlQueryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const handleRun = useCallback(() => {
    onRunRef.current?.();
    return true;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const readOnlyCompartment = new Compartment();

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        sql({ dialect }),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
          { key: 'Mod-Enter', run: handleRun },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
        editorBaseTheme,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. template load) without re-mounting
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={containerRef} className={className} />;
}
