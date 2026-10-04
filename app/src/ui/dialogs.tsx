/**
 * Dialogs, bottom sheets and toasts. ask() is the confirmation every irreversible action
 * goes through; it can also collect a note and a reason from a list.
 */
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorText } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, font, radius, space, Tone, toneColors } from '@/theme';
import { Button, Grow, Icon, Row, Stack, Txt, useDir } from './core';

export type AskOptions = {
  title: string; message?: string; confirmLabel?: string; danger?: boolean;
  note?: 'required' | 'optional'; noteLabel?: string;
  options?: { value: string; label: string }[]; optionLabel?: string;
};
export type AskResult = { note: string; option: string | null };

type DialogApi = { ask: (o: AskOptions) => Promise<AskResult | null>; toast: (msg: string, tone?: Tone) => void };
const Ctx = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<(AskOptions & { resolve: (r: AskResult | null) => void }) | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api: DialogApi = {
    ask: useCallback((o: AskOptions) => new Promise<AskResult | null>((resolve) => setAsk({ ...o, resolve })), []),
    toast: useCallback((msg: string, tone: Tone = 'success') => {
      setToast({ msg, tone });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 3200);
    }, []),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {ask ? <AskDialog opts={ask} onDone={(r) => { ask.resolve(r); setAsk(null); }} /> : null}
      {toast ? <Toast {...toast} /> : null}
    </Ctx.Provider>
  );
}

export function useDialog(): DialogApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDialog outside DialogProvider');
  return v;
}

function AskDialog({ opts, onDone }: { opts: AskOptions; onDone: (r: AskResult | null) => void }) {
  const t = useT();
  const d = useDir();
  const [note, setNote] = useState('');
  const [option, setOption] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const confirm = () => {
    if (opts.note === 'required' && !note.trim()) { setErr(t('errors.required')); return; }
    if (opts.options && !option) { setErr(t('errors.required')); return; }
    onDone({ note: note.trim(), option });
  };
  return (
    <Sheet visible title={opts.title} onClose={() => onDone(null)}
      footer={<Row gap={10}><Grow><Button label={t('common.cancel')} onPress={() => onDone(null)} block /></Grow>
        <Grow><Button label={opts.confirmLabel || t('common.confirm')} kind={opts.danger ? 'danger' : 'primary'} onPress={confirm} block /></Grow></Row>}>
      <Stack>
        {opts.message ? <Txt c="muted">{opts.message}</Txt> : null}
        {opts.options ? (
          <Stack gap={6}>
            {opts.optionLabel ? <Txt v="sm" b c="muted">{opts.optionLabel}</Txt> : null}
            {opts.options.map((o) => (
              <Pressable key={o.value} onPress={() => setOption(o.value)} style={{ flexDirection: d.row, alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: option === o.value ? colors.accent : colors.border, backgroundColor: option === o.value ? colors.accentSoft : colors.surface }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: option === o.value ? colors.accent : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                  {option === o.value ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} /> : null}
                </View>
                <Txt v="sm">{o.label}</Txt>
              </Pressable>
            ))}
          </Stack>
        ) : null}
        {opts.note ? (
          <Stack gap={6}>
            <Txt v="sm" b c="muted">{(opts.noteLabel || t('common.note')) + (opts.note === 'required' ? ' *' : '')}</Txt>
            <TextInput value={note} onChangeText={setNote} multiline accessibilityLabel={opts.noteLabel || t('common.note')} style={[inputStyle, { minHeight: 80, textAlign: d.align, textAlignVertical: 'top' }]} />
          </Stack>
        ) : null}
        {err ? <Txt v="sm" c="bad">{err}</Txt> : null}
      </Stack>
    </Sheet>
  );
}

export const inputStyle = {
  borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface,
  paddingHorizontal: 12, paddingVertical: 10, fontSize: font.md, color: colors.text, minHeight: 46,
} as const;

/** Bottom sheet with a title, scrolling body and an optional fixed footer. */
export function Sheet({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children?: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,35,0.45)' }} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88%', width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          <Row between style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm }}>
            <Txt v="h3" style={{ flex: 1 }}>{title}</Txt>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10}><Icon name="x" size={20} /></Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.sm }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {footer ? <View style={{ padding: space.lg, paddingBottom: space.lg + insets.bottom, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View> : <View style={{ height: insets.bottom }} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Toast({ msg, tone }: { msg: string; tone: Tone }) {
  const insets = useSafeAreaInsets();
  const c = toneColors[tone];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 84, alignItems: 'center' }}>
      <View style={{ backgroundColor: tone === 'danger' ? colors.bad : colors.ink, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 520, borderWidth: 1, borderColor: c.bg }}>
        <Txt v="sm" c="white" center>{msg}</Txt>
      </View>
    </View>
  );
}

/** Run an action, toast the result or the error. Returns true when it succeeded. */
export function useAction() {
  const { toast } = useDialog();
  return useCallback(async (fn: () => Promise<unknown>, success?: string): Promise<boolean> => {
    try {
      await fn();
      if (success) toast(success, 'success');
      return true;
    } catch (e: any) {
      toast(errorText(e), 'danger');
      return false;
    }
  }, [toast]);
}
