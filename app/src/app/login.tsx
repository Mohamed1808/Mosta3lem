/**
 * Sign in with a mobile number and a one-time code. The SMS provider is not chosen yet,
 * so the code is generated on the device and shown in a demo notice.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { services } from '@/backend/engine';
import { useApp, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Notice, Row, Stack, Txt } from '@/ui/core';
import { inputStyle } from '@/ui/dialogs';

const digits = (s: string) => s.replace(/\D/g, '');

export default function Login() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { signIn, lang, setLang } = useApp();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState('');
  const [user, setUser] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setErr('');
    const p = digits(phone);
    const users: any[] = await services().auth.listDemoUsers();
    const u = users.find((x) => x.phone && digits(x.phone) === p);
    if (!u) { setErr(t('login.notFound')); return; }
    setUser(u);
    setSent(String(Math.floor(100000 + Math.random() * 900000)));
    setCode('');
    setStep('code');
  };

  const verify = async () => {
    if (digits(code) !== sent) { setErr(t('login.wrongCode')); return; }
    setBusy(true);
    try { await signIn(user.id); router.replace('/'); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: space.xl }}>
          <Row between>
            <Row gap={10}>
              <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Txt c="white" b>{lang === 'ar' ? 'م' : 'M'}</Txt>
              </View>
              <Txt v="h2">{t('app.name')}</Txt>
            </Row>
            <Pressable onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} accessibilityRole="button" hitSlop={8}>
              <Txt c="accent" b>{lang === 'ar' ? 'English' : 'العربية'}</Txt>
            </Pressable>
          </Row>
          <Txt c="muted">{t('app.tagline')}</Txt>

          {step === 'phone' ? (
            <Stack>
              <Txt v="title">{t('login.title')}</Txt>
              <Stack gap={6}>
                <Txt v="sm" b c="muted">{t('login.phoneLabel')}</Txt>
                <TextInput value={phone} onChangeText={(v) => { setPhone(v); setErr(''); }} keyboardType="phone-pad" placeholder="01XXXXXXXXX"
                  autoComplete="tel" textContentType="telephoneNumber" style={[inputStyle, { textAlign: 'left', writingDirection: 'ltr', fontSize: 18, letterSpacing: 1 }]}
                  onSubmitEditing={sendCode} accessibilityLabel={t('login.phoneLabel')} />
                <Txt v="xs" c="faint">{t('login.phoneHint')}</Txt>
              </Stack>
              {err ? <Notice tone="danger" text={err} /> : null}
              <Button label={t('login.sendCode')} kind="primary" onPress={sendCode} disabled={digits(phone).length < 10} block />
            </Stack>
          ) : (
            <Stack>
              <Txt v="title">{t('login.codeTitle')}</Txt>
              <Txt c="muted">{t('login.codeSent', { phone })}</Txt>
              <Notice tone="info" text={t('login.demoCode', { code: sent })} />
              <TextInput value={code} onChangeText={(v) => { setCode(digits(v).slice(0, 6)); setErr(''); }} keyboardType="number-pad" maxLength={6}
                autoComplete="one-time-code" textContentType="oneTimeCode" placeholder="000000" onSubmitEditing={verify}
                style={[inputStyle, { textAlign: 'center', fontSize: 26, letterSpacing: 10, writingDirection: 'ltr' }]} accessibilityLabel={t('login.codeTitle')} />
              {err ? <Notice tone="danger" text={err} /> : null}
              <Button label={t('login.verify')} kind="primary" onPress={verify} disabled={code.length !== 6} busy={busy} block />
              <Button label={t('login.changeNumber')} kind="ghost" onPress={() => { setStep('phone'); setErr(''); }} />
            </Stack>
          )}

          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Stack gap={8}>
            <Txt v="sm" c="muted">{t('login.demoAccountsHint')}</Txt>
            <Button label={t('login.demoAccounts')} icon="users" onPress={() => router.push('/demo')} block />
          </Stack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
